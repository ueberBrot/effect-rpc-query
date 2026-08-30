import { describe, expect, it } from '@effect/vitest'
import { QueryClient } from '@tanstack/query-core'
import { Cause, Effect, Exit } from 'effect'

import {
  createRpcQueryUtils,
  EffectRpcQueryError,
  isEffectRpcQueryError,
  type RunPromiseExit,
} from '#effect-rpc-query'

import { group, makeReadyClient } from './fixtures/effect-rpc'

describe('createRpcQueryUtils execution boundaries', () => {
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

    const mutation = utils.health.ping.mutationOptions().mutationFn
    await mutation?.(undefined)
    expect(mutationReceivedOptions).toBe(false)
  })
})
