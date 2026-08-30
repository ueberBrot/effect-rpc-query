import {
  MutationObserver,
  QueryClient,
  skipToken as queryCoreSkipToken,
} from '@tanstack/query-core'
import { Effect, Schema } from 'effect'
import { Rpc, RpcClient, RpcGroup, RpcMiddleware } from 'effect/unstable/rpc'

import {
  createRpcQueryUtils,
  EffectRpcQueryError,
  skipToken,
  type CreateRpcQueryUtilsOptions,
  type EffectRpcQueryConfigErrorCode,
  type EffectRpcQueryKeyErrorCode,
  type JsonValue,
  type KeyEncoder,
  type QueryData,
  type RpcMutationOptions,
  type RpcOperation,
  type RpcQueryOptions,
  type RpcQueryUtils,
  type RunPromiseExit,
  type SkippedRpcQueryOptions,
  type SkipToken,
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
  success: Schema.Struct({ id: Schema.Finite, name: Schema.String }),
  error: Schema.Literal('not-found'),
})

const Ping = Rpc.make('health.ping', { success: Schema.Void })
const Secure = Rpc.make('admin.secure', {
  success: Schema.String,
}).middleware(AuthMiddleware)
const Watch = Rpc.make('events.watch', {
  success: Schema.String,
  stream: true,
})

const group = RpcGroup.make(GetUser, Ping, Secure, Watch)
type Rpcs = RpcGroup.Rpcs<typeof group>

declare const client: RpcClient.RpcClient.Flat<Rpcs>

const keyPrefix = ['app'] as const
const options: CreateRpcQueryUtilsOptions<typeof group, typeof keyPrefix> = {
  client,
  keyPrefix,
}
const utils = createRpcQueryUtils(group, options)
const typedUtils: RpcQueryUtils<typeof group, typeof keyPrefix> = utils
void typedUtils

const jsonValue: JsonValue = { nested: [true, null, 1, 'value'] }
const keyEncoder: KeyEncoder<typeof GetUser> = (payload) => ({ id: payload.id })
const runPromiseExit: RunPromiseExit = Effect.runPromiseExit
const queryData: QueryData<void> = null
const operation: RpcOperation = 'query'
const configCode: EffectRpcQueryConfigErrorCode = 'InvalidRpcPath'
const keyCode: EffectRpcQueryKeyErrorCode = 'InvalidKeyValue'
void [jsonValue, keyEncoder, runPromiseExit, queryData, operation, configCode, keyCode]

const queryClient = new QueryClient()

const selected = utils.users.get.queryOptions({
  input: { id: 1 },
  initialData: { id: 1, name: 'Ada' },
  select: (user) => user.name,
})
const typedSelected: RpcQueryOptions<typeof GetUser, typeof keyPrefix, never, string> = selected
void typedSelected
const selectedResult: Promise<string> = queryClient.query(selected)
void selectedResult

const possiblyInitialized = utils.users.get.queryOptions({
  input: { id: 1, locale: 'de' },
  initialData: () => undefined,
})
void possiblyInitialized

const cachedUser: { readonly id: number; readonly name: string } | undefined =
  queryClient.getQueryData(utils.users.get.queryKey({ id: 1 }))
void cachedUser

const skipped = utils.users.get.queryOptions(skipToken)
skipped.queryFn satisfies typeof queryCoreSkipToken
const typedSkipped: SkippedRpcQueryOptions<typeof GetUser, typeof keyPrefix> = skipped
const typedSkipToken: SkipToken = typedSkipped.queryFn
void typedSkipToken

const pingQuery: Promise<null> = queryClient.query(utils.health.ping.queryOptions())
void pingQuery

const pingMutation = new MutationObserver(queryClient, utils.health.ping.mutationOptions())
const pingMutationOptions: RpcMutationOptions<typeof Ping, typeof keyPrefix, never> =
  utils.health.ping.mutationOptions()
void pingMutationOptions
const pingMutationResult: Promise<void> = pingMutation.mutate(undefined)
void pingMutationResult

const getMutation = new MutationObserver(queryClient, utils.users.get.mutationOptions())
void getMutation.mutate({ id: 1 })

utils.admin.secure.queryOptions({
  retry: (_count, error) => {
    error satisfies EffectRpcQueryError<'unauthorized'>
    return false
  },
})

// @ts-expect-error payload-bearing queries require input or skipToken
utils.users.get.queryOptions({})
// @ts-expect-error payloadless queries do not accept an input field
utils.health.ping.queryOptions({ input: undefined })
// @ts-expect-error streaming RPCs are omitted from the utility tree
void utils.events.watch

if (skipToken !== queryCoreSkipToken) {
  throw new Error('skipToken must preserve Query Core identity')
}
