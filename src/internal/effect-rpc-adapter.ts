import { Function, Predicate, Schema, SchemaAST } from 'effect'
import type { Effect, Stream } from 'effect'
import { Rpc, RpcClient, RpcGroup, RpcSchema } from 'effect/unstable/rpc'

export type AdaptedKeyPayload =
  | {
      readonly _tag: 'Payloadless'
    }
  | {
      readonly _tag: 'DefaultEncoding'
      /** Schema-encodes a normalized payload for semantic cache identity. */
      readonly encode: (payload: unknown) => unknown
      /** Applies constructor defaults and validation synchronously. */
      readonly make: (input: unknown) => unknown
    }
  | {
      readonly _tag: 'CustomEncodingRequired'
      /** Applies constructor defaults and validation synchronously. */
      readonly make: (input: unknown) => unknown
    }

/** The runtime operations the factory needs from one unary Effect RPC. */
export interface AdaptedUnaryRpc {
  /** The complete payload-key capability classified from runtime Schema metadata. */
  readonly keyPayload: AdaptedKeyPayload

  /** The literal RPC tag used for paths and diagnostics. */
  readonly tag: string

  /** Calls the ready flat client without exposing its unstable signature. */
  readonly invoke: (input: unknown) => Effect.Effect<unknown, unknown, unknown>

  /** Selects the unary utility interface. */
  readonly kind: 'Unary'
}

/** The runtime operations the factory needs from one streaming Effect RPC. */
export interface AdaptedStreamingRpc {
  /** The complete payload-key capability classified from runtime Schema metadata. */
  readonly keyPayload: AdaptedKeyPayload

  /** Selects the streaming utility interface. */
  readonly kind: 'Streaming'

  /** The literal RPC tag used for paths and diagnostics. */
  readonly tag: string

  /** Calls the ready flat client without exposing its unstable signature. */
  readonly invoke: (input: unknown) => Stream.Stream<unknown, unknown, unknown>
}

export type AdaptedRpc = AdaptedStreamingRpc | AdaptedUnaryRpc

// Runtime Schema metadata erases encoding service types. Conservatively require a
// custom encoder for encoding-side middleware; decoding-only middleware uses identity.
const containsUnsafeKeyEncoding = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (!Predicate.isObjectOrArray(value) || seen.has(value)) {
    return false
  }
  seen.add(value)

  const transformation = value as { readonly _tag?: unknown; readonly encode?: unknown }
  if (transformation._tag === 'Middleware') {
    return transformation.encode !== Function.identity
  }

  if (SchemaAST.isAST(value)) {
    const representation = value.annotations?.['representation'] as
      | { readonly id?: unknown }
      | undefined
    if (representation?.id === 'effect/schema/Redacted') {
      return true
    }
  }

  return Object.values(value).some((child) =>
    Array.isArray(child)
      ? child.some((element) => containsUnsafeKeyEncoding(element, seen))
      : containsUnsafeKeyEncoding(child, seen),
  )
}

const adaptKeyPayload = (payloadSchema: Rpc.AnyWithProps['payloadSchema']): AdaptedKeyPayload => {
  if (SchemaAST.isVoid(payloadSchema.ast)) {
    return { _tag: 'Payloadless' }
  }

  const make = (input: unknown) => payloadSchema.make(input)
  if (containsUnsafeKeyEncoding(payloadSchema.ast)) {
    return { _tag: 'CustomEncodingRequired', make }
  }

  return {
    _tag: 'DefaultEncoding',
    encode: (payload) =>
      Schema.encodeUnknownSync(
        payloadSchema as unknown as Schema.ConstraintEncoder<unknown, never>,
      )(payload),
    make,
  }
}

/**
 * Extracts RPCs and isolates the Effect RPC's request map, stream check,
 * payload Schema, and flat-client call shape from the public implementation.
 */
export const extractRpcs = <Rpcs extends Rpc.Any, ClientError>(
  group: RpcGroup.RpcGroup<Rpcs>,
  client: RpcClient.RpcClient.Flat<Rpcs, ClientError>,
): ReadonlyArray<AdaptedRpc> => {
  const rpcs: Array<AdaptedRpc> = []

  for (const value of group.requests.values()) {
    const definition = value as unknown as Rpc.AnyWithProps
    const keyPayload = adaptKeyPayload(definition.payloadSchema)
    if (RpcSchema.isStreamSchema(definition.successSchema)) {
      rpcs.push({
        keyPayload,
        kind: 'Streaming',
        tag: definition._tag,
        invoke: (input) => client(definition._tag as never, input as never) as never,
      })
    } else {
      rpcs.push({
        keyPayload,
        kind: 'Unary',
        tag: definition._tag,
        invoke: (input) => client(definition._tag as never, input as never) as never,
      })
    }
  }

  return rpcs
}
