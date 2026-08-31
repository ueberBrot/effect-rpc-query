// fallow-ignore-file unused-file
// The packed-package verifier copies and executes this fixture in temporary consumers.
import { skipToken } from '@tanstack/query-core'
import { skipToken as reactQuerySkipToken } from '@tanstack/react-query'
import * as rpcQuery from 'effect-rpc-query'
import type {
  CreateRpcQueryUtilsOptions,
  EffectRpcQueryConfigErrorCode,
  EffectRpcQueryKeyErrorCode,
  JsonValue,
  KeyEncoder,
  QueryData,
  RpcQueryUtils,
  RunPromiseExit,
  SkipToken,
} from 'effect-rpc-query'

type PublicTypes = [
  CreateRpcQueryUtilsOptions<any, readonly [JsonValue, ...JsonValue[]]>,
  EffectRpcQueryConfigErrorCode,
  EffectRpcQueryKeyErrorCode,
  KeyEncoder<any>,
  QueryData<unknown>,
  RpcQueryUtils<any, readonly [JsonValue, ...JsonValue[]]>,
  RunPromiseExit,
  SkipToken,
]

const expectedExports = [
  'EffectRpcQueryConfigError',
  'EffectRpcQueryError',
  'EffectRpcQueryKeyError',
  'createRpcQueryUtils',
  'isEffectRpcQueryError',
  'skipToken',
] as const satisfies ReadonlyArray<keyof typeof rpcQuery>

if (JSON.stringify(Object.keys(rpcQuery).sort()) !== JSON.stringify(expectedExports)) {
  throw new Error('The package root exposed an unexpected runtime surface')
}
if (rpcQuery.skipToken !== skipToken || rpcQuery.skipToken !== reactQuerySkipToken) {
  throw new Error('The package returned a different skipToken instance')
}
