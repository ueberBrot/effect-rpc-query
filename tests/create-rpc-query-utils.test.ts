import {
  MutationObserver,
  QueryClient,
  skipToken as queryCoreSkipToken,
} from '@tanstack/query-core'
import { Cause, Effect, Exit, Schema } from 'effect'
import { Rpc, RpcClient, RpcGroup, RpcMiddleware } from 'effect/unstable/rpc'
import { describe, expect, it } from 'vite-plus/test'

import {
  createRpcQueryUtils,
  EffectRpcQueryConfigError,
  EffectRpcQueryError,
  EffectRpcQueryKeyError,
  isEffectRpcQueryError,
  skipToken,
  type JsonValue,
  type RunPromiseExit,
} from '#effect-rpc-query'

class AuthMiddleware extends RpcMiddleware.Service<AuthMiddleware>()('AuthMiddleware', {
  error: Schema.Literal('unauthorized'),
}) {}

const GetUser = Rpc.make('users.get', {
  payload: {
    id: Schema.Finite,
    locale: Schema.String.pipe(
      Schema.optionalKey,
      Schema.withConstructorDefault(Effect.succeed('en')),
    ),
  },
  success: Schema.Struct({
    id: Schema.Finite,
    locale: Schema.String,
    name: Schema.String,
  }),
  error: Schema.Literal('not-found'),
})

const Ping = Rpc.make('health.ping', { success: Schema.Void })
const Fail = Rpc.make('diagnostics.fail', {
  success: Schema.String,
  error: Schema.Literal('declared-failure'),
})
const Secure = Rpc.make('admin.secure', {
  success: Schema.String,
}).middleware(AuthMiddleware)
const Watch = Rpc.make('events.watch', {
  success: Schema.String,
  stream: true,
})

const group = RpcGroup.make(GetUser, Ping, Fail, Secure, Watch)
type Rpcs = RpcGroup.Rpcs<typeof group>

type ReadyClient = RpcClient.RpcClient.Flat<Rpcs>

const makeReadyClient = (failCause?: Cause.Cause<'declared-failure'>): ReadyClient =>
  ((tag: Rpcs['_tag'], payload: unknown) => {
    if (tag === 'users.get') {
      const user = GetUser.payloadSchema.make(payload as { readonly id: number })
      return Effect.succeed({ ...user, name: 'Ada' })
    }
    if (tag === 'diagnostics.fail') {
      return failCause === undefined
        ? Effect.fail('declared-failure' as const)
        : Effect.failCause(failCause)
    }
    if (tag === 'admin.secure') {
      return Effect.fail('unauthorized' as const)
    }
    return Effect.void
  }) as ReadyClient

describe('createRpcQueryUtils', () => {
  it('creates frozen nested utilities and semantic keys', () => {
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
    })

    expect(utils.key()).toEqual(['app'])
    expect(utils.users.key()).toEqual(['app', 'users'])
    expect(utils.users.get.key()).toEqual(['app', 'users', 'get'])
    expect(utils.users.get.mutationKey()).toEqual(['app', 'users', 'get', 'mutation'])
    expect(utils.users.get.queryKey({ id: 1 })).toEqual([
      'app',
      'users',
      'get',
      'query',
      { id: 1, locale: 'en' },
    ])
    expect('events' in utils).toBe(false)
    expect(Object.isFrozen(utils)).toBe(true)
    expect(Object.isFrozen(utils.users)).toBe(true)
    expect(Object.isFrozen(utils.users.get.queryKey({ id: 1 }))).toBe(true)
    expect(Object.isFrozen(utils.users.get.queryKey({ id: 1 }).at(-1))).toBe(true)
  })

  it('executes queries and mutations through Query Core', async () => {
    const queryClient = new QueryClient()
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
    })

    await expect(
      queryClient.query(utils.users.get.queryOptions({ input: { id: 1 } })),
    ).resolves.toEqual({ id: 1, locale: 'en', name: 'Ada' })

    const getMutation = new MutationObserver(queryClient, utils.users.get.mutationOptions())
    await expect(getMutation.mutate({ id: 2 })).resolves.toEqual({
      id: 2,
      locale: 'en',
      name: 'Ada',
    })
  })

  it('normalizes undefined queries and preserves undefined mutations', async () => {
    const queryClient = new QueryClient()
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
    })

    await expect(queryClient.query(utils.health.ping.queryOptions())).resolves.toBeNull()

    const mutation = new MutationObserver(queryClient, utils.health.ping.mutationOptions())
    await expect(mutation.mutate(undefined)).resolves.toBeUndefined()
  })

  it('wraps failed Exits without changing their Cause', async () => {
    const cause = Cause.combine(
      Cause.fail('declared-failure' as const),
      Cause.die(new Error('defect')),
    )
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(cause),
      keyPrefix: ['app'] as const,
    })

    const error = await new QueryClient()
      .query(utils.diagnostics.fail.queryOptions())
      .catch((value: unknown) => value)

    expect(error).toBeInstanceOf(EffectRpcQueryError)
    expect(isEffectRpcQueryError(error)).toBe(true)
    expect(error).toMatchObject({
      _tag: 'EffectRpcQueryError',
      operation: 'query',
      rpcTag: 'diagnostics.fail',
    })
    expect((error as EffectRpcQueryError<unknown>).cause).toBe(cause)
  })

  it('passes runner rejections through untouched', async () => {
    const rejection = new Error('runner rejected')
    const runPromiseExit: RunPromiseExit = () => Promise.reject(rejection)
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
      runPromiseExit,
    })

    await expect(new QueryClient().query(utils.health.ping.queryOptions())).rejects.toBe(rejection)
  })

  it('forwards query abort signals and gives mutations no signal', async () => {
    let querySignal: AbortSignal | undefined
    let mutationReceivedOptions: boolean | undefined
    const runPromiseExit: RunPromiseExit = async <A, E>(
      _effect: Effect.Effect<A, E>,
      options?: { readonly signal?: AbortSignal },
    ): Promise<Exit.Exit<A, E>> => {
      if (options?.signal !== undefined) {
        querySignal = options.signal
        return new Promise((resolve) => {
          options.signal?.addEventListener('abort', () => {
            resolve(Exit.succeed('cancelled' as A))
          })
        })
      }
      mutationReceivedOptions = options !== undefined
      return Exit.succeed(undefined as A)
    }
    const queryClient = new QueryClient()
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
      runPromiseExit,
    })

    const query = queryClient.query(utils.health.ping.queryOptions())
    await Promise.resolve()
    await queryClient.cancelQueries({ queryKey: utils.health.ping.key() })
    await query.catch(() => undefined)

    expect(querySignal?.aborted).toBe(true)

    const mutation = new MutationObserver(queryClient, utils.health.ping.mutationOptions())
    await mutation.mutate(undefined)
    expect(mutationReceivedOptions).toBe(false)
  })

  it('reuses Query Core skipToken', () => {
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
    })

    expect(skipToken).toBe(queryCoreSkipToken)
    expect(utils.users.get.queryOptions(skipToken)).toEqual({
      queryFn: queryCoreSkipToken,
      queryKey: ['app', 'users', 'get', 'query'],
    })
  })

  it('reports invalid utility paths with a stable configuration error', () => {
    const InvalidPath = Rpc.make('invalid..path', { success: Schema.String })
    const invalidGroup = RpcGroup.make(InvalidPath)
    type InvalidRpcs = RpcGroup.Rpcs<typeof invalidGroup>

    expect(() =>
      createRpcQueryUtils(invalidGroup, {
        client: makeReadyClient() as unknown as RpcClient.RpcClient.Flat<InvalidRpcs>,
        keyPrefix: ['app'] as const,
      }),
    ).toThrow(
      expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
        _tag: 'EffectRpcQueryConfigError',
        code: 'InvalidRpcPath',
      }),
    )
  })

  it('reports non-JSON encoder output with a stable key error', () => {
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyEncoders: {
        // The cast simulates an encoder that violates its declared JSON contract at runtime.
        'users.get': () => ({ invalid: undefined }) as unknown as JsonValue,
      },
      keyPrefix: ['app'] as const,
    })

    expect(() => utils.users.get.queryKey({ id: 1 })).toThrow(
      expect.objectContaining<Partial<EffectRpcQueryKeyError>>({
        _tag: 'EffectRpcQueryKeyError',
        code: 'InvalidKeyValue',
        rpcTag: 'users.get',
      }),
    )
  })
})
