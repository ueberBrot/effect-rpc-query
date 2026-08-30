import { Schema } from 'effect'
import type { Effect } from 'effect'
import { Rpc, RpcClient, RpcGroup, RpcSchema } from 'effect/unstable/rpc'

/** The runtime operations the factory needs from one unary Effect RPC. */
export interface AdaptedUnaryRpc {
  /** Whether callers omit constructor input for this RPC. */
  readonly payloadless: boolean

  /** The literal RPC tag used for paths and diagnostics. */
  readonly tag: string

  /** Calls the ready flat client without exposing its unstable signature. */
  readonly invoke: (input: unknown) => Effect.Effect<unknown, unknown, unknown>

  /** Applies constructor defaults and validation synchronously. */
  readonly makePayload: (input: unknown) => unknown

  /** Schema-encodes a normalized payload for semantic cache identity. */
  readonly encodePayload: (payload: unknown) => unknown
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
      payloadless: definition.payloadSchema === Schema.Void,
      tag: definition._tag,
      invoke: (input) => client(definition._tag as never, input as never),
      makePayload: (input) => definition.payloadSchema.make(input),
      encodePayload: (payload) =>
        // Serviceful encoders require a custom key encoder before this runs.
        Schema.encodeUnknownSync(
          definition.payloadSchema as unknown as Schema.ConstraintEncoder<unknown, never>,
        )(payload),
    })
  }

  return unaryRpcs
}
