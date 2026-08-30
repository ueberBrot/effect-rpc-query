import { describe, expect, it } from '@effect/vitest'
import { QueryClient } from '@tanstack/query-core'
import { Effect, Equal, Exit } from 'effect'

import {
  createRpcQueryUtils,
  EffectRpcQueryError,
  isEffectRpcQueryError,
  type RunPromiseExit,
} from '#effect-rpc-query'

import { group, makeClient } from './fixtures/effect-rpc'

describe('createRpcQueryUtils execution boundaries', () => {
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
