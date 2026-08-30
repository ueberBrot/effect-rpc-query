import type { Cause } from 'effect'

/** Stable codes for errors raised while constructing an RPC utility tree. */
export type EffectRpcQueryConfigErrorCode =
  | 'InvalidKeyPrefix'
  | 'InvalidRpcPath'
  | 'RpcPathCollision'
  | 'MissingKeyEncoder'
  | 'UnknownKeyEncoder'

/** Stable codes for synchronous query-key preparation failures. */
export type EffectRpcQueryKeyErrorCode =
  | 'PayloadConstructionFailed'
  | 'PayloadEncodingFailed'
  | 'KeyEncoderFailed'
  | 'InvalidKeyValue'

/** The TanStack operation that executed an RPC. */
export type RpcOperation = 'query' | 'mutation'

/**
 * Wraps a failed RPC Exit for TanStack while preserving its complete Effect Cause.
 *
 * Runner rejections do not use this class because they contain no Effect Cause.
 */
export class EffectRpcQueryError<E> extends Error {
  /** Identifies this error without relying on `instanceof`. */
  readonly _tag = 'EffectRpcQueryError'

  /** The literal tag of the RPC that failed. */
  readonly rpcTag: string

  /** The operation that ran the RPC. */
  readonly operation: RpcOperation

  /** The original Cause returned by the Effect runner. */
  override readonly cause: Cause.Cause<E>

  constructor(rpcTag: string, operation: RpcOperation, cause: Cause.Cause<E>) {
    super(`RPC ${rpcTag} ${operation} failed`, { cause })
    this.name = 'EffectRpcQueryError'
    this.rpcTag = rpcTag
    this.operation = operation
    this.cause = cause
  }
}

/** Reports invalid factory configuration before any utility tree is returned. */
export class EffectRpcQueryConfigError extends Error {
  /** Identifies this error without relying on `instanceof`. */
  readonly _tag = 'EffectRpcQueryConfigError'

  /** A stable, machine-readable description of the failure. */
  readonly code: EffectRpcQueryConfigErrorCode

  /** The underlying failure, when one exists. */
  override readonly cause?: unknown

  constructor(code: EffectRpcQueryConfigErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'EffectRpcQueryConfigError'
    this.code = code
    this.cause = cause
  }
}

/** Reports synchronous payload construction, encoding, or canonicalization failures. */
export class EffectRpcQueryKeyError extends Error {
  /** Identifies this error without relying on `instanceof`. */
  readonly _tag = 'EffectRpcQueryKeyError'

  /** A stable, machine-readable description of the failure. */
  readonly code: EffectRpcQueryKeyErrorCode

  /** The RPC whose query key could not be prepared. */
  readonly rpcTag: string

  /** The underlying failure, when one exists. */
  override readonly cause?: unknown

  constructor(code: EffectRpcQueryKeyErrorCode, rpcTag: string, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'EffectRpcQueryKeyError'
    this.code = code
    this.rpcTag = rpcTag
    this.cause = cause
  }
}

/** Returns whether a value is an RPC execution error from this JavaScript realm. */
export const isEffectRpcQueryError = (value: unknown): value is EffectRpcQueryError<unknown> =>
  value instanceof EffectRpcQueryError
