/** Query Core's exact runtime sentinel for disabling payload-bearing queries. */
export { skipToken } from '@tanstack/query-core'

/** Creates the public RPC utility tree. @api public */
export { createRpcQueryUtils } from './internal/rpc/create-utils'
/** Creates the public HTTP utility tree. @api public */
export { createHttpApiQueryUtils } from './internal/http/create-utils'
export {
  EffectHttpApiQueryConfigError,
  EffectHttpApiQueryError,
  EffectHttpApiQueryKeyError,
  isEffectHttpApiQueryError,
} from './internal/http/errors'
export type {
  // fallow-ignore-next-line unused-type
  EffectHttpApiQueryConfigErrorCode,
  // fallow-ignore-next-line unused-type
  EffectHttpApiQueryKeyErrorCode,
} from './internal/http/errors'
export type {
  // fallow-ignore-next-line unused-type
  CreateHttpApiQueryUtilsOptions,
  // fallow-ignore-next-line unused-type
  HttpApiKeyEncoder,
  // fallow-ignore-next-line unused-type
  HttpApiQueryUtils,
} from './internal/http/types'
/** Errors and guards raised by the public runtime API. @api public */
export {
  EffectRpcQueryConfigError,
  EffectRpcQueryEmptyStreamError,
  EffectRpcQueryError,
  EffectRpcQueryKeyError,
  isEffectRpcQueryError,
} from './internal/rpc/errors'
/** Stable error metadata exposed to downstream consumers. @api public */
export type {
  // fallow-ignore-next-line unused-type
  EffectRpcQueryConfigErrorCode,
  // fallow-ignore-next-line unused-type
  EffectRpcQueryKeyErrorCode,
} from './internal/rpc/errors'
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
