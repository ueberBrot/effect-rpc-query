import { describe, expect, it } from '@effect/vitest'
import { QueryClient, skipToken } from '@tanstack/query-core'
import { Cause, Deferred, Effect, Equal, Exit, Schema, Stream } from 'effect'
import { Rpc, RpcClient, RpcGroup } from 'effect/unstable/rpc'

import {
  createRpcQueryUtils,
  EffectRpcQueryEmptyStreamError,
  EffectRpcQueryError,
} from '#effect-rpc-query'

import { makeRpcTestClient } from './fixtures/effect-rpc'

describe('createRpcQueryUtils streaming execution', () => {
  it.effect('accumulates stream elements and publishes the latest live value', () =>
    Effect.gen(function* () {
      const Watch = Rpc.make('events.watch', {
        payload: {
          channel: Schema.String,
          locale: Schema.String.pipe(
            Schema.optionalKey,
            Schema.withConstructorDefault(Effect.succeed('en')),
          ),
        },
        success: Schema.String,
        stream: true,
      })
      const streamGroup = RpcGroup.make(Watch)
      const client = yield* makeRpcTestClient(streamGroup, {
        'events.watch': ({
          channel,
          locale = 'en',
        }: {
          readonly channel: string
          readonly locale?: string
        }) => Stream.make(`${channel}:${locale}:first`, `${channel}:${locale}:second`),
      })
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const streamed = yield* Effect.promise(() =>
        queryClient.fetchQuery(utils.events.watch.streamedOptions({ input: { channel: 'news' } })),
      )
      const live = yield* Effect.promise(() =>
        queryClient.fetchQuery(utils.events.watch.liveOptions({ input: { channel: 'news' } })),
      )

      expect(streamed).toEqual(['news:en:first', 'news:en:second'])
      expect(live).toBe('news:en:second')
      expect(utils.events.watch.streamedKey({ channel: 'news' })).toEqual(
        utils.events.watch.streamedKey({ channel: 'news', locale: 'en' }),
      )
      expect(utils.events.watch.streamedKey({ channel: 'news' })).not.toEqual(
        utils.events.watch.liveKey({ channel: 'news' }),
      )
      expect(Object.isFrozen(utils.events.watch.streamedKey({ channel: 'news' }))).toBe(true)
    }),
  )

  it.effect('fails an empty live stream with its documented package error', () =>
    Effect.gen(function* () {
      const Empty = Rpc.make('events.empty', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Empty)
      const client = yield* makeRpcTestClient(streamGroup, {
        'events.empty': () => Stream.empty,
      })
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const error = yield* Effect.promise(() =>
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
          .fetchQuery(utils.events.empty.liveOptions())
          .catch((cause: unknown) => cause),
      )

      expect(error).toEqual(
        expect.objectContaining({
          _tag: 'EffectRpcQueryEmptyStreamError',
          rpcTag: 'events.empty',
        }),
      )
      expect(error).toBeInstanceOf(EffectRpcQueryEmptyStreamError)
    }),
  )

  it.effect('supports reset, append, and replace refetch modes', () =>
    Effect.gen(function* () {
      let run = 0
      const Watch = Rpc.make('events.watch', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Watch)
      const client = yield* makeRpcTestClient(streamGroup, {
        'events.watch': () => {
          run += 1
          return Stream.make(`run-${String(run)}-first`, `run-${String(run)}-second`)
        },
      })
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const fetch = (refetchMode: 'append' | 'replace' | 'reset') =>
        queryClient.fetchQuery(utils.events.watch.streamedOptions({ refetchMode }))

      expect(yield* Effect.promise(() => fetch('reset'))).toEqual(['run-1-first', 'run-1-second'])
      expect(yield* Effect.promise(() => fetch('append'))).toEqual([
        'run-1-first',
        'run-1-second',
        'run-2-first',
        'run-2-second',
      ])
      expect(yield* Effect.promise(() => fetch('replace'))).toEqual(['run-3-first', 'run-3-second'])
      expect(yield* Effect.promise(() => fetch('reset'))).toEqual(['run-4-first', 'run-4-second'])
    }),
  )

  it.effect('preserves stream failure and defect Causes', () =>
    Effect.gen(function* () {
      const Declared = Rpc.make('events.declared', {
        success: Schema.String,
        error: Schema.Literal('stream-failure'),
        stream: true,
      })
      const Defect = Rpc.make('events.defect', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Declared, Defect)
      const defect = new Error('stream defect')
      const client = yield* makeRpcTestClient(streamGroup, {
        'events.declared': () => Stream.fail('stream-failure' as const),
        'events.defect': () => Stream.die(defect),
      })
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

      const cases = [
        {
          direct: yield* Effect.exit(Stream.runCollect(client('events.declared', undefined))),
          fetch: () => queryClient.fetchQuery(utils.events.declared.streamedOptions()),
          operation: 'streamed',
          tag: 'events.declared',
        },
        {
          direct: yield* Effect.exit(Stream.runCollect(client('events.defect', undefined))),
          fetch: () => queryClient.fetchQuery(utils.events.defect.liveOptions()),
          operation: 'live',
          tag: 'events.defect',
        },
      ] as const

      for (const { direct, fetch, operation, tag } of cases) {
        if (Exit.isSuccess(direct)) {
          throw new Error(`Expected ${tag} to fail`)
        }
        const error = yield* Effect.promise(() => fetch().catch((cause: unknown) => cause))

        expect(error).toBeInstanceOf(EffectRpcQueryError)
        expect(error).toMatchObject({ operation, rpcTag: tag })
        expect(Equal.equals((error as EffectRpcQueryError<unknown>).cause, direct.cause)).toBe(true)
      }
    }),
  )

  it.effect('finalizes a stream after normal completion', () =>
    Effect.gen(function* () {
      const Watch = Rpc.make('events.watch', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Watch)
      const finalized = yield* Deferred.make<void>()
      const source = Stream.make('first', 'second').pipe(
        Stream.ensuring(Deferred.succeed(finalized, undefined).pipe(Effect.asVoid)),
      )
      const client = ((_tag: string, _payload: unknown) => source) as RpcClient.RpcClient.Flat<
        RpcGroup.Rpcs<typeof streamGroup>
      >
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      const result = yield* Effect.promise(() =>
        new QueryClient().fetchQuery(utils.events.watch.streamedOptions()),
      )

      expect(result).toEqual(['first', 'second'])
      yield* Deferred.await(finalized)
    }),
  )

  it.effect('interrupts and finalizes a stream when Query Core cancels it', () =>
    Effect.gen(function* () {
      const Watch = Rpc.make('events.watch', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Watch)
      const waiting = yield* Deferred.make<void>()
      const finalized = yield* Deferred.make<void>()
      const source = Stream.make('ready').pipe(
        Stream.concat(
          Stream.fromEffect(
            Deferred.succeed(waiting, undefined).pipe(Effect.andThen(Effect.never)),
          ),
        ),
        Stream.ensuring(Deferred.succeed(finalized, undefined).pipe(Effect.asVoid)),
      )
      const client = ((_tag: string, _payload: unknown) => source) as RpcClient.RpcClient.Flat<
        RpcGroup.Rpcs<typeof streamGroup>
      >
      const queryClient = new QueryClient()
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })
      const options = utils.events.watch.streamedOptions()

      const query = queryClient.fetchQuery(options).catch((cause: unknown) => cause)
      yield* Deferred.await(waiting)
      yield* Effect.promise(() => queryClient.cancelQueries({ queryKey: options.queryKey }))
      yield* Deferred.await(finalized)
      expect(yield* Effect.promise(() => query)).toEqual(['ready'])
    }),
  )

  it.effect('reuses Query Core skipToken for payload-bearing streams', () =>
    Effect.gen(function* () {
      const Watch = Rpc.make('events.watch', {
        payload: { channel: Schema.String },
        success: Schema.String,
        stream: true,
      })
      const streamGroup = RpcGroup.make(Watch)
      const client = yield* makeRpcTestClient(streamGroup, {
        'events.watch': () => Stream.empty,
      })
      const utils = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      })

      expect(utils.events.watch.streamedOptions(skipToken)).toMatchObject({
        queryFn: skipToken,
        queryKey: ['app', 'events', 'watch', 'streamed'],
      })
      expect(utils.events.watch.liveOptions(skipToken)).toMatchObject({
        queryFn: skipToken,
        queryKey: ['app', 'events', 'watch', 'live'],
      })
    }),
  )
})
