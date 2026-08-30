import {
  MutationObserver,
  QueryClient,
  skipToken as queryCoreSkipToken,
} from '@tanstack/query-core'
import { Context, Effect, Schema } from 'effect'
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
  type RpcQueryUtils,
  type RunPromiseExit,
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

class EncodingService extends Context.Service<EncodingService, { readonly suffix: string }>()(
  'EncodingService',
) {}

const BasePayload = Schema.Struct({ value: Schema.String })
const ServicefulPayload = BasePayload.pipe(
  Schema.middlewareEncoding<typeof BasePayload, EncodingService>((encoding) =>
    Effect.flatMap(EncodingService, () => encoding),
  ),
)
const Serviceful = Rpc.make('encoding.serviceful', {
  payload: ServicefulPayload,
  success: Schema.String,
})
const Secret = Rpc.make('secrets.read', {
  payload: { secret: Schema.Redacted(Schema.String) },
  success: Schema.String,
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
const configCode: EffectRpcQueryConfigErrorCode = 'InvalidRpcPath'
const keyCode: EffectRpcQueryKeyErrorCode = 'InvalidKeyValue'
void [jsonValue, keyEncoder, runPromiseExit, queryData, configCode, keyCode]

const queryClient = new QueryClient()

const selected = utils.users.get.queryOptions({
  input: { id: 1 },
  initialData: { id: 1, name: 'Ada' },
  select: (user) => user.name,
})
const definedInitialData:
  | { readonly id: number; readonly name: string }
  | (() => { readonly id: number; readonly name: string }) = selected.initialData
void definedInitialData
const selectedResult: Promise<string> = queryClient.query(selected)
void selectedResult
void queryClient.prefetchQuery(selected)

const possiblyInitialized = utils.users.get.queryOptions({
  input: { id: 1, locale: 'de' },
  initialData: () => undefined,
})
const possiblyUndefinedInitialData:
  | { readonly id: number; readonly name: string }
  | (() => { readonly id: number; readonly name: string } | undefined)
  | undefined = possiblyInitialized.initialData
void possiblyUndefinedInitialData

declare const directInitialData: QueryData<Rpc.Success<typeof GetUser>> | undefined
const possiblyDirectlyInitialized = utils.users.get.queryOptions({
  input: { id: 1 },
  initialData: directInitialData,
})
const possiblyDirectInitialData:
  | { readonly id: number; readonly name: string }
  | (() => { readonly id: number; readonly name: string } | undefined)
  | undefined = possiblyDirectlyInitialized.initialData
void possiblyDirectInitialData

const encoderGroup = RpcGroup.make(Serviceful, Secret)
type EncoderRpcs = RpcGroup.Rpcs<typeof encoderGroup>
declare const encoderClient: RpcClient.RpcClient.Flat<EncoderRpcs>
declare const encoderRunner: RunPromiseExit<EncodingService>

// @ts-expect-error serviceful and redacted payloads require explicit key encoders
const missingEncoderOptions: CreateRpcQueryUtilsOptions<typeof encoderGroup, typeof keyPrefix> = {
  client: encoderClient,
  keyPrefix,
  runPromiseExit: encoderRunner,
}
void missingEncoderOptions

const encoderOptions: CreateRpcQueryUtilsOptions<typeof encoderGroup, typeof keyPrefix> = {
  client: encoderClient,
  keyEncoders: {
    'encoding.serviceful': (payload) => payload,
    'secrets.read': () => ({ redacted: true }),
  },
  keyPrefix,
  runPromiseExit: encoderRunner,
}
createRpcQueryUtils(encoderGroup, encoderOptions)

const cachedUser: { readonly id: number; readonly name: string } | undefined =
  queryClient.getQueryData(utils.users.get.queryKey({ id: 1 }))
void cachedUser

const skipped = utils.users.get.queryOptions(skipToken)
skipped.queryFn satisfies typeof queryCoreSkipToken
const typedSkipToken: SkipToken = skipped.queryFn
void typedSkipToken

const pingQuery: Promise<null> = queryClient.query(utils.health.ping.queryOptions())
void pingQuery

const pingMutation = new MutationObserver(queryClient, utils.health.ping.mutationOptions())
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
