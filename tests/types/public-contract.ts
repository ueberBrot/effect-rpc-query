// fallow-ignore-file code-duplication
// This fixture stays self-contained so built-declaration checks exercise the full public contract.
import {
  MutationObserver,
  QueryClient,
  skipToken as queryCoreSkipToken,
} from '@tanstack/query-core'
import {
  skipToken as reactQuerySkipToken,
  usePrefetchQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createRootRouteWithContext, createRoute } from '@tanstack/react-router'
import { Context, Effect, Schema } from 'effect'
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
} from 'effect-rpc-query'
import { Rpc, RpcClient, RpcGroup, RpcMiddleware } from 'effect/unstable/rpc'

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
const AuditWatch = Rpc.make('events.audit.watch', {
  success: Schema.String,
  stream: true,
})
const FindProject = Rpc.make('projects.by-id.find', {
  payload: { id: Schema.String },
  success: Schema.Struct({ id: Schema.String }),
})
const ProjectHealth = Rpc.make('projects.health.ping', { success: Schema.Void })
const ProjectWatch = Rpc.make('projects.watch', {
  success: Schema.String,
  stream: true,
})
const BracketOnly = Rpc.make('billing-history.list all', {
  payload: { accountId: Schema.String },
  success: Schema.Array(Schema.String),
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
const SecretList = Rpc.make('secrets.list', {
  payload: Schema.Array(Schema.Union([Schema.String, Schema.Redacted(Schema.String)])),
  success: Schema.String,
})

class ClassPayload extends Schema.Class<ClassPayload>('ClassPayload')({
  id: Schema.Finite,
}) {}
const ClassRead = Rpc.make('classes.read', {
  payload: ClassPayload,
  success: Schema.String,
})

const group = RpcGroup.make(
  GetUser,
  Ping,
  Secure,
  Watch,
  AuditWatch,
  FindProject,
  ProjectHealth,
  ProjectWatch,
  BracketOnly,
)
type Rpcs = RpcGroup.Rpcs<typeof group>

declare const client: RpcClient.RpcClient.Flat<Rpcs>

const keyPrefix = ['app'] as const
const options: CreateRpcQueryUtilsOptions<typeof group, typeof keyPrefix> = {
  client,
  keyPrefix,
}

// @ts-expect-error key prefixes must contain at least one value
createRpcQueryUtils(group, { client, keyPrefix: [] as const })
// @ts-expect-error key prefixes accept only strict JSON values
createRpcQueryUtils(group, { client, keyPrefix: ['app', new Date(0)] as const })

const utils = createRpcQueryUtils(group, options)
const typedUtils: RpcQueryUtils<typeof group, typeof keyPrefix> = utils
void typedUtils

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Condition extends true> = Condition
type ExpectedLeafInterface = 'key' | 'mutationKey' | 'mutationOptions' | 'queryKey' | 'queryOptions'
type ExactLeafInterface = Assert<
  Equal<keyof (typeof utils)['projects']['by-id']['find'], ExpectedLeafInterface>
>

const exactLeafInterface: ExactLeafInterface = true
const projectKey = utils.projects['by-id'].find.queryKey({ id: 'project-1' })
const projectPing = utils.projects.health.ping.queryOptions()
const bracketOnly = utils['billing-history']['list all'].queryOptions({
  input: { accountId: 'account-1' },
})
void [exactLeafInterface, projectKey, projectPing, bracketOnly]

const jsonValue: JsonValue = { nested: [true, null, 1, 'value'] }
const keyEncoder: KeyEncoder<typeof GetUser> = (payload) => ({ id: payload.id })
const classKeyEncoder: KeyEncoder<typeof ClassRead> = (payload) => {
  payload satisfies ClassPayload
  return { id: payload.id }
}
const runPromiseExit: RunPromiseExit = Effect.runPromiseExit
const queryData: QueryData<void> = null
const configCode: EffectRpcQueryConfigErrorCode = 'InvalidRpcPath'
const keyCode: EffectRpcQueryKeyErrorCode = 'InvalidKeyValue'
void [jsonValue, keyEncoder, classKeyEncoder, runPromiseExit, queryData, configCode, keyCode]

createRpcQueryUtils(group, {
  client,
  keyEncoders: {
    // @ts-expect-error payloadless operations have no payload identity to override
    'health.ping': () => null,
  },
  keyPrefix,
})

createRpcQueryUtils(group, {
  client,
  keyEncoders: {
    // @ts-expect-error streaming operations are omitted and cannot have encoders
    'events.watch': () => null,
  },
  keyPrefix,
})

createRpcQueryUtils(group, {
  client,
  keyEncoders: {
    // @ts-expect-error encoder configuration is keyed by literal unary RPC tags
    'users.missing': () => null,
  },
  keyPrefix,
})

createRpcQueryUtils(group, {
  client,
  keyEncoders: {
    // @ts-expect-error key encoders must return synchronously
    'users.get': async (payload) => ({ id: payload.id }),
  },
  keyPrefix,
})

createRpcQueryUtils(group, {
  client,
  keyEncoders: {
    // @ts-expect-error Effect-returning key encoders are outside the public contract
    'users.get': (payload) => Effect.succeed({ id: payload.id }),
  },
  keyPrefix,
})

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

const selectedHook = useQuery(selected)
const selectedHookData: string = selectedHook.data
selectedHook.error satisfies EffectRpcQueryError<'not-found'> | null
void selectedHookData

const queryOptions = utils.users.get.queryOptions({
  enabled: (query) => query.state.data?.id !== 0,
  gcTime: 60_000,
  input: { id: 1 },
  meta: { source: 'fixture' },
  networkMode: 'offlineFirst',
  notifyOnChangeProps: ['data', 'error'],
  placeholderData: (previous) => previous,
  refetchInterval: (query) => (query.state.data === undefined ? 1_000 : false),
  refetchOnMount: (query) => query.state.data === undefined,
  retry: (_count, error) => {
    error satisfies EffectRpcQueryError<'not-found'>
    return false
  },
  retryDelay: (_attempt, error) => {
    error satisfies EffectRpcQueryError<'not-found'>
    return 0
  },
  select: (user) => user.name,
  staleTime: (query) => (query.state.data?.name === 'Ada' ? Infinity : 0),
  structuralSharing: false,
})
type ExactQueryHashInput = Assert<
  Equal<Parameters<typeof queryOptions.queryKeyHashFn>[0], typeof queryOptions.queryKey>
>
const exactQueryHashInput: ExactQueryHashInput = true

const queryHook = useQuery(queryOptions)
const queryHookData: string | undefined = queryHook.data
queryHook.error satisfies EffectRpcQueryError<'not-found'> | null
const suspenseHook = useSuspenseQuery(queryOptions)
const suspenseData: string = suspenseHook.data
suspenseHook.error satisfies EffectRpcQueryError<'not-found'> | null
usePrefetchQuery(queryOptions)

const rootRoute = createRootRouteWithContext<{ readonly queryClient: QueryClient }>()()
const queryRoute = createRoute({
  getParentRoute: () => rootRoute,
  loader: ({ context }) => context.queryClient.query(queryOptions),
  path: 'users',
})
type QueryRouteLoaderData = Assert<Equal<(typeof queryRoute.types)['loaderData'], string>>
const queryRouteLoaderData: QueryRouteLoaderData = true
void [exactQueryHashInput, queryHookData, suspenseData, queryRouteLoaderData]

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

const secretListGroup = RpcGroup.make(SecretList)
type SecretListRpcs = RpcGroup.Rpcs<typeof secretListGroup>
declare const secretListClient: RpcClient.RpcClient.Flat<SecretListRpcs>

// @ts-expect-error redacted values nested in a top-level array require an encoder
const missingSecretListEncoder: CreateRpcQueryUtilsOptions<
  typeof secretListGroup,
  typeof keyPrefix
> = {
  client: secretListClient,
  keyPrefix,
}
void missingSecretListEncoder

const cachedUser: { readonly id: number; readonly name: string } | undefined =
  queryClient.getQueryData(utils.users.get.queryKey({ id: 1 }))
void cachedUser

const concreteQueryKey = utils.users.get.queryKey({ id: 1 })
concreteQueryKey satisfies readonly ['app', 'users', 'get', 'query', JsonValue]
const cachedState = queryClient.getQueryState(concreteQueryKey)
cachedState?.error satisfies EffectRpcQueryError<'not-found'> | null | undefined

const skipped = utils.users.get.queryOptions(skipToken)
skipped.queryFn satisfies typeof queryCoreSkipToken
const typedSkipToken: SkipToken = skipped.queryFn
void typedSkipToken
type ExactSkippedQueryHashInput = Assert<
  Equal<Parameters<typeof skipped.queryKeyHashFn>[0], typeof skipped.queryKey>
>
const exactSkippedQueryHashInput: ExactSkippedQueryHashInput = true
void exactSkippedQueryHashInput
const skippedHook = useQuery(skipped)
const skippedData: { readonly id: number; readonly name: string } | undefined = skippedHook.data
skippedHook.error satisfies EffectRpcQueryError<'not-found'> | null
void skippedData

// @ts-expect-error suspense queries cannot use the skip sentinel
useSuspenseQuery(skipped)
// @ts-expect-error prefetch-only hooks cannot use the skip sentinel
usePrefetchQuery(skipped)

const pingQuery: Promise<null> = queryClient.query(utils.health.ping.queryOptions())
void pingQuery

const pingMutation = new MutationObserver(queryClient, utils.health.ping.mutationOptions())
const pingMutationResult: Promise<void> = pingMutation.mutate(undefined)
void pingMutationResult

const getMutationOptions = utils.users.get.mutationOptions<{
  readonly previousName: string
}>({
  gcTime: 60_000,
  onError: (error, variables, onMutateResult) => {
    error satisfies EffectRpcQueryError<'not-found'>
    variables satisfies { readonly id: number; readonly locale?: string }
    onMutateResult satisfies { readonly previousName: string } | undefined
  },
  onMutate: (variables) => {
    variables satisfies { readonly id: number; readonly locale?: string }
    return { previousName: 'Grace' }
  },
  onSuccess: (data, variables, onMutateResult) => {
    data satisfies { readonly id: number; readonly name: string }
    variables satisfies { readonly id: number; readonly locale?: string }
    onMutateResult satisfies { readonly previousName: string }
  },
  throwOnError: (error) => {
    error satisfies EffectRpcQueryError<'not-found'>
    return false
  },
})
getMutationOptions.mutationKey satisfies readonly ['app', 'users', 'get', 'mutation']
getMutationOptions.throwOnError satisfies
  | boolean
  | ((error: EffectRpcQueryError<'not-found'>) => boolean)
  | undefined
const getMutation = new MutationObserver(queryClient, getMutationOptions)
const getMutationResult: Promise<{ readonly id: number; readonly name: string }> =
  getMutation.mutate({ id: 1 })
void getMutationResult

// @ts-expect-error mutation variables arrive at execution, not option construction
utils.users.get.mutationOptions({ input: { id: 1 } })
utils.users.get.mutationOptions({
  // @ts-expect-error the package owns the mutation function
  mutationFn: async () => ({ id: 1, name: 'Grace' }),
})
utils.users.get.mutationOptions({
  // @ts-expect-error the package owns the mutation key
  mutationKey: ['custom'],
})

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
// @ts-expect-error payloadless queries do not accept the skip sentinel
utils.health.ping.queryOptions(skipToken)
// @ts-expect-error key builders never accept the skip sentinel
utils.users.get.queryKey(skipToken)
// @ts-expect-error mutation builders never accept the skip sentinel
utils.users.get.mutationOptions(skipToken)
// @ts-expect-error the package owns the query function
utils.users.get.queryOptions({
  input: { id: 1 },
  queryFn: queryCoreSkipToken,
})
// @ts-expect-error the package owns the query key
utils.users.get.queryOptions({
  input: { id: 1 },
  queryKey: ['custom'],
})
// @ts-expect-error the package owns the per-call query key hash function
utils.users.get.queryOptions({
  input: { id: 1 },
  queryKeyHashFn: JSON.stringify,
})
// @ts-expect-error streaming RPCs are omitted from the utility tree
void utils.projects.watch
// @ts-expect-error branches emptied by stream omission are absent
void utils.events
// @ts-expect-error leaves expose no direct execution helper
void utils.projects['by-id'].find.call
// @ts-expect-error leaves expose no mutation cancellation helper
void utils.users.get.cancelMutation

if (skipToken !== queryCoreSkipToken || skipToken !== reactQuerySkipToken) {
  throw new Error('skipToken must preserve Query Core and React Query identity')
}
