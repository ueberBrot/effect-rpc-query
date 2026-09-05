import { Function, Predicate, Schema, SchemaAST } from 'effect'
import type { Effect, Stream } from 'effect'
import { Rpc, RpcClient, RpcGroup, RpcSchema } from 'effect/unstable/rpc'

import {
  EffectRpcQueryConfigError,
  EffectRpcQueryError,
  EffectRpcQueryKeyError,
} from '../../errors'
import type { OperationDescription, RuntimeKeyEncoder, TreeErrors } from '../core/operation'
import { makeStreamQuery } from './streamed-query'
import type { StreamRefetchMode, StreamingRpcOptions, UnaryRpcOptions } from './types'

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
interface AdaptedUnaryRpc {
  /** The complete payload-key capability classified from runtime Schema metadata. */
  readonly keyPayload: AdaptedKeyPayload

  /** The literal RPC tag used for paths and diagnostics. */
  readonly tag: string

  /** Calls the ready flat client without exposing its unstable signature. */
  readonly invoke: (
    input: unknown,
    options?: UnaryRpcOptions,
  ) => Effect.Effect<unknown, unknown, unknown>

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
  readonly invoke: (
    input: unknown,
    options?: StreamingRpcOptions,
  ) => Stream.Stream<unknown, unknown, unknown>
}

type AdaptedRpc = AdaptedStreamingRpc | AdaptedUnaryRpc

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
    if (SchemaAST.isSuspend(value)) {
      try {
        if (containsUnsafeKeyEncoding(value.thunk(), seen)) return true
      } catch {
        return true
      }
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
): ReadonlyArray<OperationDescription> => {
  const rpcs: Array<AdaptedRpc> = []

  for (const value of group.requests.values()) {
    const definition = value as unknown as Rpc.AnyWithProps
    const keyPayload = adaptKeyPayload(definition.payloadSchema)
    if (RpcSchema.isStreamSchema(definition.successSchema)) {
      rpcs.push({
        keyPayload,
        kind: 'Streaming',
        tag: definition._tag,
        invoke: (input, options) =>
          client(definition._tag as never, input as never, options as never) as never,
      })
    } else {
      rpcs.push({
        keyPayload,
        kind: 'Unary',
        tag: definition._tag,
        invoke: (input, options) =>
          client(definition._tag as never, input as never, options as never) as never,
      })
    }
  }

  return rpcs.map(describeRpc)
}

const preparePayload = (
  rpcTag: string,
  keyPayload: Exclude<AdaptedKeyPayload, { readonly _tag: 'Payloadless' }>,
  input: unknown,
  keyEncoder: RuntimeKeyEncoder | undefined,
) => {
  let normalized: unknown
  try {
    normalized = keyPayload.make(input)
  } catch (cause) {
    throw new EffectRpcQueryKeyError(
      'PayloadConstructionFailed',
      rpcTag,
      `Could not construct the payload for RPC ${rpcTag}`,
      cause,
    )
  }
  let keyValue: unknown
  try {
    keyValue = keyEncoder
      ? keyEncoder(normalized)
      : keyPayload._tag === 'DefaultEncoding'
        ? keyPayload.encode(normalized)
        : undefined
  } catch (cause) {
    throw new EffectRpcQueryKeyError(
      keyEncoder ? 'KeyEncoderFailed' : 'PayloadEncodingFailed',
      rpcTag,
      `Could not encode the key payload for RPC ${rpcTag}`,
      cause,
    )
  }
  // The ready client constructs this normalized payload again during execution.
  return { input: normalized, keyValue }
}

const takeRpcOptions = (options: Record<string, unknown>) => {
  const rpcOptions = options['rpcOptions']
  delete options['rpcOptions']
  return rpcOptions
}

const describeRpc = (rpc: AdaptedRpc): OperationDescription => {
  const { keyPayload } = rpc
  const identity = {
    id: rpc.tag,
    path: rpc.tag.split('.'),
    input:
      keyPayload._tag === 'Payloadless'
        ? { _tag: 'Inputless' as const }
        : {
            _tag: 'Input' as const,
            requiresEncoder: keyPayload._tag === 'CustomEncodingRequired',
            prepare: (input: unknown, encoder: RuntimeKeyEncoder | undefined) =>
              preparePayload(rpc.tag, keyPayload, input, encoder),
            pageInput: keyPayload.make,
            invalidKey: (cause: unknown) =>
              new EffectRpcQueryKeyError(
                'InvalidKeyValue',
                rpc.tag,
                `The key payload for RPC ${rpc.tag} is not JSON-safe`,
                cause,
              ),
          },
    takeOptions: takeRpcOptions,
  }
  if (rpc.kind === 'Unary') {
    return {
      ...identity,
      kind: 'Unary',
      invoke: (input, options) => rpc.invoke(input, options as UnaryRpcOptions | undefined),
      executionError: (operation, cause) => new EffectRpcQueryError(rpc.tag, operation, cause),
    }
  }
  return {
    ...identity,
    kind: 'Streaming',
    prepareStream: (options, operation, runPromiseExit, requestOptions) => {
      const refetchMode = options['refetchMode'] as StreamRefetchMode | undefined
      delete options['refetchMode']
      const maxChunks = options['maxChunks'] as number | undefined
      delete options['maxChunks']
      if (maxChunks !== undefined && (!Number.isSafeInteger(maxChunks) || maxChunks <= 0)) {
        throw new EffectRpcQueryConfigError(
          'InvalidMaxChunks',
          'maxChunks must be a positive safe integer',
          { rpcTag: rpc.tag },
        )
      }
      return (input) =>
        makeStreamQuery({
          input,
          rpcOptions: requestOptions as StreamingRpcOptions | undefined,
          policy:
            operation === 'live'
              ? { _tag: 'Live' }
              : {
                  _tag: 'Accumulated',
                  ...(refetchMode === undefined ? {} : { refetchMode }),
                  ...(maxChunks === undefined ? {} : { maxChunks }),
                },
          rpc,
          runPromiseExit,
        })
    },
  }
}

export const rpcTreeErrors: TreeErrors = {
  invalidPrefix: (cause) =>
    new EffectRpcQueryConfigError(
      'InvalidKeyPrefix',
      cause === undefined
        ? 'keyPrefix must be a non-empty readonly tuple of JSON-safe values'
        : 'keyPrefix must contain only JSON-safe values',
      { cause },
    ),
  invalidPath: (rpcTag) =>
    new EffectRpcQueryConfigError(
      'InvalidRpcPath',
      `RPC tag ${rpcTag} cannot be projected into a utility path`,
      { rpcTag },
    ),
  pathCollision: (rpcTag, segments, relation) => {
    const path = segments.join('.')
    return new EffectRpcQueryConfigError(
      'RpcPathCollision',
      `RPC tag ${rpcTag} ${relation} utility path ${path}`,
      { path, rpcTag },
    )
  },
  unknownEncoder: (rpcTag) =>
    new EffectRpcQueryConfigError(
      'UnknownKeyEncoder',
      `No payload-bearing RPC exists for key encoder ${rpcTag}`,
      { rpcTag },
    ),
  missingEncoder: (rpcTag) =>
    new EffectRpcQueryConfigError(
      'MissingKeyEncoder',
      `RPC ${rpcTag} requires a safe custom key encoder`,
      { rpcTag },
    ),
}
