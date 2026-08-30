import { Effect, Schema, Stream } from 'effect'
import { Rpc, RpcGroup, RpcTest } from 'effect/unstable/rpc'

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
const Watch = Rpc.make('events.watch', {
  success: Schema.String,
  stream: true,
})
const ObjectNamed = Rpc.make('toString.child', { success: Schema.Void })

export const group = RpcGroup.make(GetUser, Ping, Fail, Watch, ObjectNamed)

/** Acquires an official in-memory flat client for an RPC group and its handlers. */
export const makeRpcTestClient = Effect.fn('TestRpc.makeRpcTestClient')(function* <
  Rpcs extends Rpc.Any,
>(rpcGroup: RpcGroup.RpcGroup<Rpcs>, handlers: RpcGroup.HandlersFrom<Rpcs>) {
  return yield* RpcTest.makeClient(rpcGroup, { flatten: true }).pipe(
    Effect.provide(rpcGroup.toLayer(handlers)),
  )
})

/** Acquires the shared test group's official in-memory client. */
export const makeClient = Effect.fn('TestRpc.makeClient')(function* () {
  const handlers = group.of({
    'diagnostics.fail': () => Effect.fail('declared-failure' as const),
    'events.watch': () => Stream.empty,
    'health.ping': () => Effect.void,
    'toString.child': () => Effect.void,
    'users.get': (payload) =>
      Effect.succeed({ id: payload.id, locale: payload.locale ?? 'en', name: 'Ada' }),
  })
  return yield* makeRpcTestClient(group, handlers)
})
