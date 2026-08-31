import { describe, expect, it } from '@effect/vitest'
import { CancelledError, QueryClient, QueryObserver } from '@tanstack/query-core'
import { Deferred, Effect, Equal, Exit, Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/unstable/rpc'

import {
  createRpcQueryUtils,
  EffectRpcQueryError,
  EffectRpcQueryKeyError,
  isEffectRpcQueryError,
  type RunPromiseExit,
} from '#effect-rpc-query'

import { group, makeClient, makeRpcTestClient } from './fixtures/effect-rpc'

describe('createRpcQueryUtils execution boundaries', () => {
  it.effect('executes with the default runner and reuses query-stable cached data', () =>
    Effect.gen(function* () {
      const ReadProfile = Rpc.make('profiles.read', {
        payload: {
          id: Schema.Finite,
          locale: Schema.String.pipe(
            Schema.optionalKey,
            Schema.withConstructorDefault(Effect.succeed('en')),
          ),
        },
        success: Schema.Struct({ id: Schema.Finite, locale: Schema.String }),
      })
      const profileGroup = RpcGroup.make(ReadProfile)
      let executions = 0
      const client = yield* makeRpcTestClient(profileGroup, {
        'profiles.read': (payload: { readonly id: number; readonly locale?: string }) => {
          executions += 1
          return Effect.succeed({ id: payload.id, locale: payload.locale ?? 'en' })
        },
      })
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(profileGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const firstOptions = utils.profiles.read.queryOptions({
        input: { id: 1 },
        staleTime: Number.POSITIVE_INFINITY,
      })
      const secondOptions = utils.profiles.read.queryOptions({
        input: { id: 1, locale: 'en' },
        staleTime: Number.POSITIVE_INFINITY,
      })

      expect(firstOptions).not.toBe(secondOptions)
      expect(Object.isFrozen(firstOptions)).toBe(false)
      expect(firstOptions.queryKey).toEqual(secondOptions.queryKey)
      expect(firstOptions.queryKey.at(-1)).toEqual({ id: 1, locale: 'en' })

      const first = yield* Effect.promise(() => queryClient.query(firstOptions))
      const cached = yield* Effect.promise(() => queryClient.query(secondOptions))

      expect(first).toEqual({ id: 1, locale: 'en' })
      expect(cached).toEqual(first)
      expect(executions).toBe(1)
    }),
  )

  it.effect('normalizes only successful undefined query data and sets no Query policy', () =>
    Effect.gen(function* () {
      const client = yield* makeClient()
      const utils = createRpcQueryUtils(group, {
        client,
        keyPrefix: ['app'] as const,
      })
      const options = utils.health.ping.queryOptions()

      expect(Object.keys(options).sort()).toEqual(['queryFn', 'queryKey', 'queryKeyHashFn'])
      expect(yield* Effect.promise(() => new QueryClient().query(options))).toBeNull()
    }),
  )

  it.effect('fails synchronous key preparation before Query Core can execute the RPC', () =>
    Effect.gen(function* () {
      const Invalid = Rpc.make('invalid.read', {
        payload: { value: Schema.String },
        success: Schema.String,
      })
      const invalidGroup = RpcGroup.make(Invalid)
      let executions = 0
      const client = yield* makeRpcTestClient(invalidGroup, {
        'invalid.read': () => {
          executions += 1
          return Effect.succeed('unexpected')
        },
      })
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(invalidGroup, {
        client,
        keyPrefix: ['app'] as const,
      })
      const invalidInput = { value: 42 } as unknown as { readonly value: string }

      expect(() =>
        queryClient.query(utils.invalid.read.queryOptions({ input: invalidInput })),
      ).toThrow(
        expect.objectContaining<Partial<EffectRpcQueryKeyError>>({
          code: 'PayloadConstructionFailed',
          rpcTag: 'invalid.read',
        }),
      )
      expect(executions).toBe(0)
    }),
  )

  it.effect('interrupts default Effect execution when Query Core cancels', () =>
    Effect.gen(function* () {
      const Slow = Rpc.make('diagnostics.slow', { success: Schema.String })
      const slowGroup = RpcGroup.make(Slow)
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const client = yield* makeRpcTestClient(slowGroup, {
        'diagnostics.slow': () =>
          Effect.gen(function* () {
            yield* Deferred.succeed(started, undefined)
            return yield* Effect.never
          }).pipe(
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined).pipe(Effect.asVoid)),
          ),
      })
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(slowGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const query = queryClient.query(utils.diagnostics.slow.queryOptions())
      yield* Deferred.await(started)
      yield* Effect.promise(() =>
        queryClient.cancelQueries({ queryKey: utils.diagnostics.slow.key() }),
      )
      yield* Deferred.await(interrupted)
      yield* Effect.promise(() => expect(query).rejects.toBeInstanceOf(CancelledError))
    }),
  )

  it.effect('passes user callback errors through untouched', () =>
    Effect.gen(function* () {
      const callbackError = new Error('select failed')
      const client = yield* makeClient()
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(group, {
        client,
        keyPrefix: ['app'] as const,
      })
      const observer = new QueryObserver(
        queryClient,
        utils.users.get.queryOptions({
          input: { id: 1 },
          select: () => {
            throw callbackError
          },
        }),
      )

      const observedError = yield* Effect.promise(
        () =>
          new Promise<unknown>((resolve) => {
            const unsubscribe = observer.subscribe((result) => {
              if (result.isError) {
                unsubscribe()
                resolve(result.error)
              }
            })
          }),
      )

      expect(observedError).toBe(callbackError)
    }),
  )

  it.effect('wraps failed Exits without changing their Cause', () =>
    Effect.gen(function* () {
      const client = yield* makeClient()
      const directExit = yield* Effect.exit(client('diagnostics.fail', undefined))
      if (Exit.isSuccess(directExit)) {
        throw new Error('Expected the direct RPC client call to fail')
      }
      const utils = createRpcQueryUtils(group, {
        client,
        keyPrefix: ['app'] as const,
      })

      const error = yield* Effect.promise(() =>
        new QueryClient()
          .query(utils.diagnostics.fail.queryOptions())
          .catch((value: unknown) => value),
      )

      expect(error).toBeInstanceOf(EffectRpcQueryError)
      expect(isEffectRpcQueryError(error)).toBe(true)
      expect(error).toMatchObject({
        _tag: 'EffectRpcQueryError',
        operation: 'query',
        rpcTag: 'diagnostics.fail',
      })
      expect(Equal.equals((error as EffectRpcQueryError<unknown>).cause, directExit.cause)).toBe(
        true,
      )
      expect(isEffectRpcQueryError(new Error('other'))).toBe(false)
      expect(isEffectRpcQueryError({ _tag: 'EffectRpcQueryError' })).toBe(false)
    }),
  )

  it.effect('does not retain raw query input in execution errors', () =>
    Effect.gen(function* () {
      const FailSecret = Rpc.make('secrets.fail', {
        payload: { secret: Schema.String },
        success: Schema.String,
        error: Schema.Literal('declared-failure'),
      })
      const secretGroup = RpcGroup.make(FailSecret)
      const client = yield* makeRpcTestClient(secretGroup, {
        'secrets.fail': () => Effect.fail('declared-failure' as const),
      })
      const utils = createRpcQueryUtils(secretGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const error = yield* Effect.promise(() =>
        new QueryClient()
          .query(utils.secrets.fail.queryOptions({ input: { secret: 'do-not-retain' } }))
          .catch((value: unknown) => value),
      )

      expect(error).toBeInstanceOf(EffectRpcQueryError)
      expect(error).not.toHaveProperty('input')
      expect(error).not.toHaveProperty('payload')
      expect((error as Error).message).not.toContain('do-not-retain')
      expect(JSON.stringify(error)).not.toContain('do-not-retain')
    }),
  )

  it.effect('passes runner rejections through untouched', () =>
    Effect.gen(function* () {
      const rejection = new Error('runner rejected')
      const runPromiseExit: RunPromiseExit = () => Promise.reject(rejection)
      const client = yield* makeClient()
      const utils = createRpcQueryUtils(group, {
        client,
        keyPrefix: ['app'] as const,
        runPromiseExit,
      })

      yield* Effect.promise(() =>
        expect(new QueryClient().query(utils.health.ping.queryOptions())).rejects.toBe(rejection),
      )
    }),
  )

  it.effect('forwards query abort signals and gives mutations no signal', () =>
    Effect.gen(function* () {
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
      const client = yield* makeClient()
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(group, {
        client,
        keyPrefix: ['app'] as const,
        runPromiseExit,
      })

      const query = queryClient.query(utils.health.ping.queryOptions())
      yield* Effect.yieldNow
      yield* Effect.promise(() => queryClient.cancelQueries({ queryKey: utils.health.ping.key() }))
      yield* Effect.promise(() => query.catch(() => undefined))

      expect(querySignal?.aborted).toBe(true)

      const mutation = utils.health.ping.mutationOptions().mutationFn
      yield* Effect.promise(() => mutation?.(undefined) ?? Promise.resolve())
      expect(mutationReceivedOptions).toBe(false)
    }),
  )
})
