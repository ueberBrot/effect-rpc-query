import type {
  DataTag,
  InitialDataFunction,
  MutationObserverOptions,
  NonUndefinedGuard,
  QueryFunction,
  QueryKeyHashFunction,
  QueryObserverOptions,
  SkipToken,
} from '@tanstack/query-core'
import type { Effect, Exit, Redacted, Schema } from 'effect'
import type { Rpc, RpcClient, RpcGroup, RpcSchema } from 'effect/unstable/rpc'

import type { EffectRpcQueryError } from './errors'

/** A JSON scalar accepted in key prefixes and canonical key payloads. */
export type JsonPrimitive = boolean | null | number | string

/** An immutable JSON value accepted in cache keys. */
export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | readonly JsonValue[]

/**
 * The value cached for a successful RPC query.
 *
 * TanStack rejects `undefined` query data, so possible `undefined` values become
 * `null`. Mutation results keep the RPC success type unchanged.
 */
export type QueryData<A> = undefined extends A ? Exclude<A, undefined> | null : A

/** Runs an RPC Effect and returns its Exit, optionally forwarding an abort signal. */
export type RunPromiseExit<R = never> = <A, E>(
  effect: Effect.Effect<A, E, R>,
  options?: { readonly signal?: AbortSignal },
) => Promise<Exit.Exit<A, E>>

/** Converts a normalized RPC payload into a synchronous, JSON-safe key value. */
export type KeyEncoder<R extends Rpc.Any> = (payload: Rpc.Payload<R>) => JsonValue

/** Extracts the literal RPC union retained by a group. */
export type RpcsOf<Group extends RpcGroup.Any> = RpcGroup.Rpcs<Group>

/** Extracts the payload Schema retained by an RPC definition. */
export type PayloadSchema<R extends Rpc.Any> =
  R extends Rpc.Rpc<
    infer _Tag,
    infer Payload,
    infer _Success,
    infer _Error,
    infer _Middleware,
    infer _Requires
  >
    ? Payload
    : never

// Streaming RPCs disappear before path projection, so they cannot leave empty branches.
export type UnaryRpc<R extends Rpc.Any> =
  Rpc.SuccessSchema<R> extends RpcSchema.Stream<Schema.Top, Schema.Top> ? never : R

export type UnaryRpcs<Group extends RpcGroup.Any> =
  RpcsOf<Group> extends infer R ? (R extends Rpc.Any ? UnaryRpc<R> : never) : never

/** Selects unary RPCs whose query keys include constructed payload identity. */
export type PayloadBearingUnaryRpcs<Group extends RpcGroup.Any> =
  UnaryRpcs<Group> extends infer R
    ? R extends Rpc.Any
      ? void extends Rpc.PayloadConstructor<R>
        ? never
        : R
      : never
    : never

/** Extracts failures introduced by client-side RPC middleware. */
export type ClientMiddlewareError<R extends Rpc.Any> =
  R extends Rpc.Rpc<string, Schema.Top, Schema.Top, Schema.Top, infer Middleware, unknown>
    ? Middleware['~ClientError']
    : never

/** Every typed failure that can reach an RPC client call. */
export type RpcFailure<R extends Rpc.Any, ClientError> =
  | Rpc.Error<R>
  | ClientMiddlewareError<R>
  | ClientError

/** Splits a literal dotted RPC tag into its path tuple. */
export type Segments<Tag extends string> = Tag extends `${infer Head}.${infer Tail}`
  ? readonly [Head, ...Segments<Tail>]
  : readonly [Tag]

export type RpcKey<Prefix extends readonly JsonValue[], R extends Rpc.Any> = readonly [
  ...Prefix,
  ...Segments<R['_tag']>,
]

export type QueryOperationKey<Prefix extends readonly JsonValue[], R extends Rpc.Any> = readonly [
  ...RpcKey<Prefix, R>,
  'query',
]

/** A payload-specific key carrying Query Core's inferred data and error tags. */
export type ConcreteQueryKey<
  Prefix extends readonly JsonValue[],
  R extends Rpc.Any,
  ClientError,
> = DataTag<
  void extends Rpc.PayloadConstructor<R>
    ? QueryOperationKey<Prefix, R>
    : readonly [...QueryOperationKey<Prefix, R>, JsonValue],
  QueryData<Rpc.Success<R>>,
  EffectRpcQueryError<RpcFailure<R, ClientError>>
>

export type MutationKey<Prefix extends readonly JsonValue[], R extends Rpc.Any> = readonly [
  ...RpcKey<Prefix, R>,
  'mutation',
]

export type OwnedQueryOption = 'queryFn' | 'queryKey' | 'queryKeyHashFn'
export type OwnedMutationOption = 'mutationFn' | 'mutationKey'

/** Query Core inputs after removing fields owned by this package. */
export type QueryInputOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  Selected,
> = Omit<
  QueryObserverOptions<
    QueryData<Rpc.Success<R>>,
    EffectRpcQueryError<RpcFailure<R, ClientError>>,
    Selected,
    QueryData<Rpc.Success<R>>,
    ConcreteQueryKey<Prefix, R, ClientError>
  >,
  OwnedQueryOption
>

/** Query Observer options generated for one concrete unary RPC request. */
export type RpcQueryOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  Selected = QueryData<Rpc.Success<R>>,
> = QueryInputOptions<R, Prefix, ClientError, Selected> & {
  /** Runs the RPC and returns cacheable query data. */
  readonly queryFn: QueryFunction<
    QueryData<Rpc.Success<R>>,
    ConcreteQueryKey<Prefix, R, ClientError>
  >
  /** The concrete, data-tagged key for this normalized payload. */
  readonly queryKey: ConcreteQueryKey<Prefix, R, ClientError>
  /** Query Core's stable hash for the canonical semantic key. */
  readonly queryKeyHashFn: QueryKeyHashFunction<ConcreteQueryKey<Prefix, R, ClientError>>
}

/** Query input whose initial value is known to be present. */
export type DefinedQueryInputOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  Selected,
> = Omit<QueryInputOptions<R, Prefix, ClientError, Selected>, 'initialData'> & {
  readonly initialData:
    | NonUndefinedGuard<QueryData<Rpc.Success<R>>>
    | (() => NonUndefinedGuard<QueryData<Rpc.Success<R>>>)
}

/** Query input with no guaranteed initial value. */
export type UndefinedQueryInputOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  Selected,
> = Omit<QueryInputOptions<R, Prefix, ClientError, Selected>, 'initialData'> & {
  readonly initialData?:
    | undefined
    | InitialDataFunction<NonUndefinedGuard<QueryData<Rpc.Success<R>>>>
    | NonUndefinedGuard<QueryData<Rpc.Success<R>>>
}

/** Generated options whose initial value remains visibly required. */
export type DefinedRpcQueryOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  Selected,
> = Omit<RpcQueryOptions<R, Prefix, ClientError, Selected>, 'initialData'> &
  Pick<DefinedQueryInputOptions<R, Prefix, ClientError, Selected>, 'initialData'>

/** Query Core options returned when a payload-bearing query uses `skipToken`. */
export type SkippedRpcQueryOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
> = Omit<
  QueryObserverOptions<
    QueryData<Rpc.Success<R>>,
    EffectRpcQueryError<RpcFailure<R, ClientError>>,
    QueryData<Rpc.Success<R>>,
    QueryData<Rpc.Success<R>>,
    QueryOperationKey<Prefix, R>
  >,
  OwnedQueryOption
> & {
  /** Query Core's exact skip sentinel. */
  readonly queryFn: SkipToken
  /** The operation prefix, which contains no unconstructed payload. */
  readonly queryKey: QueryOperationKey<Prefix, R>
  /** Query Core's stable hash for the operation key. */
  readonly queryKeyHashFn: QueryKeyHashFunction<QueryOperationKey<Prefix, R>>
}

/** Mutation options generated for one unary RPC. */
export type RpcMutationOptions<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  OnMutateResult = unknown,
> = Omit<
  MutationObserverOptions<
    Rpc.Success<R>,
    EffectRpcQueryError<RpcFailure<R, ClientError>>,
    Rpc.PayloadConstructor<R>,
    OnMutateResult
  >,
  OwnedMutationOption
> & {
  /** Runs the RPC with the variables supplied to the mutation. */
  readonly mutationFn: (variables: Rpc.PayloadConstructor<R>) => Promise<Rpc.Success<R>>
  /** The operation key; mutation variables never affect its identity. */
  readonly mutationKey: MutationKey<Prefix, R>
}

/** Overloads query construction by payload presence, initial data, and skipping. */
export type QueryOptionsBuilder<
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
> =
  void extends Rpc.PayloadConstructor<R>
    ? {
        <Selected = QueryData<Rpc.Success<R>>>(
          options: DefinedQueryInputOptions<R, Prefix, ClientError, Selected>,
        ): DefinedRpcQueryOptions<R, Prefix, ClientError, Selected>
        <Selected = QueryData<Rpc.Success<R>>>(
          options?: UndefinedQueryInputOptions<R, Prefix, ClientError, Selected>,
        ): RpcQueryOptions<R, Prefix, ClientError, Selected>
      }
    : {
        <Selected = QueryData<Rpc.Success<R>>>(
          options: DefinedQueryInputOptions<R, Prefix, ClientError, Selected> & {
            readonly input: Rpc.PayloadConstructor<R>
          },
        ): DefinedRpcQueryOptions<R, Prefix, ClientError, Selected>
        <Selected = QueryData<Rpc.Success<R>>>(
          options: UndefinedQueryInputOptions<R, Prefix, ClientError, Selected> & {
            readonly input: Rpc.PayloadConstructor<R>
          },
        ): RpcQueryOptions<R, Prefix, ClientError, Selected>
        (token: SkipToken): SkippedRpcQueryOptions<R, Prefix, ClientError>
      }

export type QueryKeyBuilder<R extends Rpc.Any, Prefix extends readonly JsonValue[], ClientError> =
  void extends Rpc.PayloadConstructor<R>
    ? () => ConcreteQueryKey<Prefix, R, ClientError>
    : (input: Rpc.PayloadConstructor<R>) => ConcreteQueryKey<Prefix, R, ClientError>

/** The key and option builders exposed at one unary RPC path. */
export interface RpcQueryLeaf<R extends Rpc.Any, Prefix extends readonly JsonValue[], ClientError> {
  /** Returns the immutable key prefix for this RPC. */
  readonly key: () => RpcKey<Prefix, R>

  /** Returns the immutable key shared by every mutation of this RPC. */
  readonly mutationKey: () => MutationKey<Prefix, R>

  /** Builds fresh Query Core mutation options without binding variables. */
  readonly mutationOptions: <OnMutateResult = unknown>(
    options?: Omit<
      MutationObserverOptions<
        Rpc.Success<R>,
        EffectRpcQueryError<RpcFailure<R, ClientError>>,
        Rpc.PayloadConstructor<R>,
        OnMutateResult
      >,
      OwnedMutationOption
    >,
  ) => RpcMutationOptions<R, Prefix, ClientError, OnMutateResult>

  /** Builds a semantic, data-tagged query key from constructor input. */
  readonly queryKey: QueryKeyBuilder<R, Prefix, ClientError>

  /** Builds fresh Query Core query options from constructor input or `skipToken`. */
  readonly queryOptions: QueryOptionsBuilder<R, Prefix, ClientError>
}

// Each tag becomes one nested object; intersections merge siblings at shared branches.
export type PathTree<
  Tag extends string,
  R extends Rpc.Any,
  Prefix extends readonly JsonValue[],
  ClientError,
  Path extends readonly string[] = readonly [],
> = Tag extends `${infer Head}.${infer Tail}`
  ? {
      readonly [Key in Head]: {
        /** Returns the immutable key prefix for this RPC namespace. */
        readonly key: () => readonly [...Prefix, ...Path, Head]
      } & PathTree<Tail, R, Prefix, ClientError, readonly [...Path, Head]>
    }
  : {
      readonly [Key in Tag]: RpcQueryLeaf<R, Prefix, ClientError>
    }

/** Merges every projected RPC path into one nested utility object. */
export type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never

/** An eager utility tree projected from the group's dotted unary RPC tags. */
export type RpcQueryUtils<
  Group extends RpcGroup.Any,
  Prefix extends readonly [JsonValue, ...JsonValue[]],
  ClientError = never,
> = {
  /** Returns the immutable root key supplied to the factory. */
  readonly key: () => Prefix
} & UnionToIntersection<
  UnaryRpcs<Group> extends infer R
    ? R extends Rpc.Any
      ? PathTree<R['_tag'], R, Prefix, ClientError>
      : never
    : never
>

/** Recursively detects explicit redacted values in a payload's decoded type. */
export type ContainsRedacted<A> =
  A extends Redacted.Redacted<unknown>
    ? true
    : A extends readonly (infer Value)[]
      ? ContainsRedacted<Value>
      : A extends object
        ? true extends { readonly [Key in keyof A]: ContainsRedacted<A[Key]> }[keyof A]
          ? true
          : false
        : false

/** Whether default synchronous encoding is unsafe or requires Effect services. */
export type NeedsKeyEncoder<R extends Rpc.Any> = [PayloadSchema<R>['EncodingServices']] extends [
  never,
]
  ? true extends ContainsRedacted<Rpc.Payload<R>>
    ? true
    : false
  : true

/** Selects RPCs whose default key encoding is unsafe or cannot run synchronously. */
export type RequiredEncoderRpcs<Group extends RpcGroup.Any> =
  PayloadBearingUnaryRpcs<Group> extends infer R
    ? R extends Rpc.Any
      ? NeedsKeyEncoder<R> extends true
        ? R
        : never
      : never
    : never

/** Exact encoder map with unsafe or serviceful payload entries made required. */
export type KeyEncoders<Group extends RpcGroup.Any> = {
  readonly [R in RequiredEncoderRpcs<Group> as R['_tag']]: KeyEncoder<R>
} & Partial<{
  readonly [R in Exclude<
    PayloadBearingUnaryRpcs<Group>,
    RequiredEncoderRpcs<Group>
  > as R['_tag']]: KeyEncoder<R>
}>

/** Makes the encoder map optional only when no RPC requires an override. */
export type KeyEncoderOption<Group extends RpcGroup.Any> = [
  PayloadBearingUnaryRpcs<Group>,
] extends [never]
  ? { readonly keyEncoders?: never }
  : [RequiredEncoderRpcs<Group>] extends [never]
    ? {
        /** Overrides synchronous semantic encoding for selected RPC payloads. */
        readonly keyEncoders?: KeyEncoders<Group>
      }
    : {
        /** Supplies safe synchronous identity for every serviceful or redacted payload. */
        readonly keyEncoders: KeyEncoders<Group>
      }

/** Requires a custom runner when client-side Schema services remain. */
export type RunnerOption<Group extends RpcGroup.Any> = [
  Rpc.ServicesClient<UnaryRpcs<Group>>,
] extends [never]
  ? {
      /** Overrides service-free execution; defaults to `Effect.runPromiseExit`. */
      readonly runPromiseExit?: RunPromiseExit
    }
  : {
      /** Runs RPC Effects that retain client-side Schema services. */
      readonly runPromiseExit: RunPromiseExit<Rpc.ServicesClient<UnaryRpcs<Group>>>
    }

/** Configuration for deriving a utility tree from an Effect RPC group. */
export type CreateRpcQueryUtilsOptions<
  Group extends RpcGroup.Any,
  Prefix extends readonly [JsonValue, ...JsonValue[]],
  ClientError = never,
> = {
  /** A ready, flat RPC client whose Scope remains owned by the caller. */
  readonly client: RpcClient.RpcClient.Flat<RpcsOf<Group>, ClientError>

  /** A non-empty JSON-safe tuple that namespaces every generated key. */
  readonly keyPrefix: Prefix
} & KeyEncoderOption<Group> &
  RunnerOption<Group>
