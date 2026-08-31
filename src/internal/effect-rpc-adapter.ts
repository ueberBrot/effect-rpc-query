import { Context, Effect, Option, Predicate, Schema, SchemaAST } from 'effect'
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
}

const containsServiceInstruction = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (!Predicate.isObjectKeyword(value) || seen.has(value)) {
    return false
  }
  seen.add(value)

  if (Context.isKey(value)) {
    return !Context.isReference(value)
  }

  return Object.values(value).some((child) => containsServiceInstruction(child, seen))
}

const encodingMiddlewareRequiresService = (value: {
  readonly encode: (effect: unknown, options: SchemaAST.ParseOptions) => unknown
}): boolean => {
  try {
    const probe = Effect.succeed(Option.none())
    return containsServiceInstruction(value.encode(probe, {}))
  } catch {
    // Middleware is expected to construct an Effect without running user work.
    // If it cannot do that, default synchronous encoding is not safe to assume.
    return true
  }
}

// Runtime Schema metadata erases service types, so inspect the Effect assembled by
// encoding middleware without running it. Redacted annotations remain directly visible.
const containsUnsafeKeyEncoding = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return false
  }
  seen.add(value)

  const transformation = value as {
    readonly _tag?: unknown
    readonly encode?: (effect: unknown, options: SchemaAST.ParseOptions) => unknown
  }
  if (transformation._tag === 'Middleware' && transformation.encode !== undefined) {
    return encodingMiddlewareRequiresService({ encode: transformation.encode })
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
 * Extracts unary RPCs and isolates the Effect RC's request map, stream check,
 * payload Schema, and flat-client call shape from the public implementation.
 */
export const extractUnaryRpcs = <Rpcs extends Rpc.Any, ClientError>(
  group: RpcGroup.RpcGroup<Rpcs>,
  client: RpcClient.RpcClient.Flat<Rpcs, ClientError>,
): ReadonlyArray<AdaptedUnaryRpc> => {
  const unaryRpcs: Array<AdaptedUnaryRpc> = []

  for (const value of group.requests.values()) {
    const definition = value as unknown as Rpc.AnyWithProps
    if (RpcSchema.isStreamSchema(definition.successSchema)) {
      continue
    }

    unaryRpcs.push({
      keyPayload: adaptKeyPayload(definition.payloadSchema),
      tag: definition._tag,
      invoke: (input) => client(definition._tag as never, input as never),
    })
  }

  return unaryRpcs
}
