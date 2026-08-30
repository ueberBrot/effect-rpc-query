import { describe, expect, it } from '@effect/vitest'
import {
  MutationObserver,
  QueryClient,
  skipToken as queryCoreSkipToken,
} from '@tanstack/query-core'
import { Effect } from 'effect'

import { createRpcQueryUtils, skipToken } from '#effect-rpc-query'

import { group, makeReadyClient, makeRuntimeClient, runtimeGroup } from './fixtures/effect-rpc'

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
    expect(utils.toString.child.key()).toEqual(['app', 'toString', 'child'])
    expect('events' in utils).toBe(false)
    expect(Object.isFrozen(utils)).toBe(true)
    expect(Object.isFrozen(utils.users)).toBe(true)
    expect(Object.isFrozen(utils.users.get.queryKey({ id: 1 }))).toBe(true)
    expect(Object.isFrozen(utils.users.get.queryKey({ id: 1 }).at(-1))).toBe(true)
    const options = utils.users.get.queryOptions({ input: { id: 1 } })
    expect(options.queryKeyHashFn(options.queryKey)).toBe(JSON.stringify(options.queryKey))
  })

  it.effect('executes through Effect RPC and Query Core', () =>
    Effect.gen(function* () {
      const client = yield* makeRuntimeClient
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(runtimeGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const user = yield* Effect.promise(() =>
        queryClient.query(utils.users.get.queryOptions({ input: { id: 1 } })),
      )
      expect(user).toEqual({ id: 1, locale: 'en', name: 'Ada' })

      const getMutation = new MutationObserver(queryClient, utils.users.get.mutationOptions())
      const mutated = yield* Effect.promise(() => getMutation.mutate({ id: 2 }))
      expect(mutated).toEqual({ id: 2, locale: 'en', name: 'Ada' })
    }),
  )

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

  it('reuses Query Core skipToken', () => {
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyPrefix: ['app'] as const,
    })

    expect(skipToken).toBe(queryCoreSkipToken)
    const skipped = utils.users.get.queryOptions(skipToken)
    expect(skipped).toMatchObject({
      queryFn: queryCoreSkipToken,
      queryKey: ['app', 'users', 'get', 'query'],
    })
    expect(skipped.queryKeyHashFn(skipped.queryKey)).toBe(JSON.stringify(skipped.queryKey))
  })
})
