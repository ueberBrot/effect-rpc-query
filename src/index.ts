/** Query Core's exact runtime sentinel for disabling payload-bearing queries. */
export { skipToken } from '@tanstack/query-core'

/** Creates the public RPC utility tree. @api public */
export { createRpcQueryUtils } from './create-rpc-query-utils'
/** Errors and guards raised by the public runtime API. @api public */
export {
  EffectRpcQueryConfigError,
  EffectRpcQueryError,
  EffectRpcQueryKeyError,
  isEffectRpcQueryError,
} from './errors'
/** Stable error metadata exposed to downstream consumers. @api public */
export type {
  // fallow-ignore-next-line unused-type
  EffectRpcQueryConfigErrorCode,
  // fallow-ignore-next-line unused-type
  EffectRpcQueryKeyErrorCode,
  // fallow-ignore-next-line unused-type
  RpcOperation,
} from './errors'
/** Types for annotating generated utilities and custom adapters. @api public */
export type {
  // fallow-ignore-next-line unused-type
  CreateRpcQueryUtilsOptions,
  JsonValue,
  // fallow-ignore-next-line unused-type
  KeyEncoder,
  // fallow-ignore-next-line unused-type
  QueryData,
  // fallow-ignore-next-line unused-type
  RpcMutationOptions,
  // fallow-ignore-next-line unused-type
  RpcQueryOptions,
  // fallow-ignore-next-line unused-type
  RpcQueryUtils,
  RunPromiseExit,
  // fallow-ignore-next-line unused-type
  SkippedRpcQueryOptions,
} from './types'

/** The type of Query Core's exact skip sentinel. @api public */
// fallow-ignore-next-line unused-type
export type { SkipToken } from '@tanstack/query-core'
