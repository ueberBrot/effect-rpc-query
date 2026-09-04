import { describe, expect, it } from '@effect/vitest'
import { QueryClient, QueryObserver, skipToken } from '@tanstack/query-core'
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

  it.effect('preserves stream, RPC, and defect Causes', () =>
    Effect.gen(function* () {
      const Declared = Rpc.make('events.declared', {
        success: Schema.String,
        error: Schema.Literal('stream-failure'),
        stream: true,
      }).setError(Schema.Literal('rpc-failure'))
      const StreamFailure = Rpc.make('events.stream-failure', {
        success: Schema.String,
        error: Schema.Literal('stream-failure'),
        stream: true,
      })
      const Defect = Rpc.make('events.defect', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Declared, StreamFailure, Defect)
      const defect = new Error('stream defect')
      const client = yield* makeRpcTestClient(streamGroup, {
        'events.declared': () => Stream.fail('rpc-failure' as const),
        'events.defect': () => Stream.die(defect),
        'events.stream-failure': () => Stream.fail('stream-failure' as const),
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
          direct: yield* Effect.exit(Stream.runCollect(client('events.stream-failure', undefined))),
          fetch: () => queryClient.fetchQuery(utils.events['stream-failure'].streamedOptions()),
          operation: 'streamed',
          tag: 'events.stream-failure',
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

  it('interrupts and finalizes a stream when Query Core cancels it', async () => {
    const Watch = Rpc.make('events.watch', { success: Schema.String, stream: true })
    const streamGroup = RpcGroup.make(Watch)
    const waiting = Effect.runSync(Deferred.make<void>())
    const interrupted = Effect.runSync(Deferred.make<void>())
    const finalized = Effect.runSync(Deferred.make<void>())
    const source = Stream.make('ready').pipe(
      Stream.concat(
        Stream.fromEffect(
          Deferred.succeed(waiting, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined).pipe(Effect.asVoid)),
          ),
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
    await Effect.runPromise(Deferred.await(waiting))
    await queryClient.cancelQueries({ queryKey: options.queryKey })
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 10))

    expect(Effect.runSync(Deferred.isDone(interrupted))).toBe(true)
    expect(Effect.runSync(Deferred.isDone(finalized))).toBe(true)
    expect(await query).toEqual(['ready'])
  })

  it.effect('finalizes the previous active stream before refetching', () =>
    Effect.gen(function* () {
      const Watch = Rpc.make('events.watch', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Watch)
      const firstStarted = yield* Deferred.make<void>()
      const firstFinalized = yield* Deferred.make<void>()
      const secondStarted = yield* Deferred.make<void>()
      const secondFinalized = yield* Deferred.make<void>()
      let run = 0
      const client = ((_tag: string, _payload: unknown) => {
        run += 1
        const started = run === 1 ? firstStarted : secondStarted
        const finalized = run === 1 ? firstFinalized : secondFinalized
        return Stream.make(`run-${String(run)}`).pipe(
          Stream.concat(
            Stream.fromEffect(
              Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
            ),
          ),
          Stream.ensuring(Deferred.succeed(finalized, undefined).pipe(Effect.asVoid)),
        )
      }) as RpcClient.RpcClient.Flat<RpcGroup.Rpcs<typeof streamGroup>>
      const queryClient = new QueryClient()
      const options = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      }).events.watch.streamedOptions()

      const firstFetch = queryClient.fetchQuery(options).catch((cause: unknown) => cause)
      yield* Deferred.await(firstStarted)
      const refetch = queryClient
        .refetchQueries({ exact: true, queryKey: options.queryKey })
        .catch((cause: unknown) => cause)
      yield* Deferred.await(firstFinalized)
      yield* Deferred.await(secondStarted)
      yield* Effect.promise(() =>
        queryClient.cancelQueries({ queryKey: options.queryKey }).catch(() => undefined),
      )
      yield* Deferred.await(secondFinalized)

      yield* Effect.promise(() => firstFetch)
      expect(run).toBe(2)
      yield* Effect.promise(() => refetch)
    }),
  )

  it.effect('finalizes an active stream when its last observer unsubscribes', () =>
    Effect.gen(function* () {
      const Watch = Rpc.make('events.watch', { success: Schema.String, stream: true })
      const streamGroup = RpcGroup.make(Watch)
      const started = yield* Deferred.make<void>()
      const finalized = yield* Deferred.make<void>()
      const source = Stream.make('ready').pipe(
        Stream.concat(
          Stream.fromEffect(
            Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
          ),
        ),
        Stream.ensuring(Deferred.succeed(finalized, undefined).pipe(Effect.asVoid)),
      )
      const client = ((_tag: string, _payload: unknown) => source) as RpcClient.RpcClient.Flat<
        RpcGroup.Rpcs<typeof streamGroup>
      >
      const queryClient = new QueryClient()
      const options = createRpcQueryUtils(streamGroup, {
        client,
        keyPrefix: ['app'] as const,
      }).events.watch.streamedOptions()
      const observer = new QueryObserver(queryClient, options)
      const unsubscribe = observer.subscribe(() => undefined)

      yield* Deferred.await(started)
      unsubscribe()
      yield* Deferred.await(finalized)
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
