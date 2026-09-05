/** Query Core's exact runtime sentinel for disabling payload-bearing queries. */
export { skipToken } from '@tanstack/query-core'

/** Creates the public RPC utility tree. @api public */
export { createRpcQueryUtils } from './internal/rpc/create-rpc-query-utils'
/** Errors and guards raised by the public runtime API. @api public */
export {
  EffectRpcQueryConfigError,
  EffectRpcQueryEmptyStreamError,
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
} from './errors'
export type {
  JsonValue,
  // fallow-ignore-next-line unused-type
  QueryData,
  RunPromiseExit,
} from './internal/core/types'
/** Types for annotating generated utilities and custom adapters. @api public */
export type {
  // fallow-ignore-next-line unused-type
  CreateRpcQueryUtilsOptions,
  // fallow-ignore-next-line unused-type
  KeyEncoder,
  // fallow-ignore-next-line unused-type
  RpcQueryUtils,
  StreamingRpcOptions,
  UnaryRpcOptions,
} from './internal/rpc/types'

/** The type of Query Core's exact skip sentinel. @api public */
// fallow-ignore-next-line unused-type
export type { SkipToken } from '@tanstack/query-core'
