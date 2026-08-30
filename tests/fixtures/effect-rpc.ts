import { Cause, Effect, Schema } from 'effect'
import { Rpc, RpcClient, RpcGroup, RpcMiddleware, RpcTest } from 'effect/unstable/rpc'

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
const ObjectNamed = Rpc.make('toString.child', { success: Schema.Void })

export const group = RpcGroup.make(GetUser, Ping, Fail, Secure, Watch, ObjectNamed)
export type Rpcs = RpcGroup.Rpcs<typeof group>
export type ReadyClient = RpcClient.RpcClient.Flat<Rpcs>

/** A controllable flat-client double for boundary and failure-path tests. */
export const makeReadyClient = (failCause?: Cause.Cause<'declared-failure'>): ReadyClient =>
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

/** A minimal real RPC group for exercising Effect's in-memory client/server path. */
export const runtimeGroup = RpcGroup.make(GetUser, Ping)
const RuntimeHandlers = runtimeGroup.toLayer({
  'health.ping': () => Effect.void,
  'users.get': (payload) =>
    Effect.succeed({ id: payload.id, locale: payload.locale ?? 'en', name: 'Ada' }),
})

/** Acquires a scoped flat client backed by the official Effect RPC test transport. */
export const makeRuntimeClient = RpcTest.makeClient(runtimeGroup, { flatten: true }).pipe(
  Effect.provide(RuntimeHandlers),
)
