import { exampleRpcGroup } from '@effect-rpc-query/contracts'
import { Effect, Layer, Scope } from 'effect'
import { HttpEffect, HttpMiddleware, HttpServerRequest } from 'effect/unstable/http'
import { RpcSerialization, RpcServer } from 'effect/unstable/rpc'

import { exampleRpcHandlersLayer } from './rpc-handlers.ts'

const rpcLayer = Layer.mergeAll(exampleRpcHandlersLayer, RpcSerialization.layerJson)

/** Builds the host-neutral HTTP RPC handler within the caller-owned Scope. */
export const makeExampleRpcWebHandler = Effect.fn('ExampleRpc.makeExampleRpcWebHandler')(
  function* () {
    const scope = yield* Scope.Scope
    const rpcContext = yield* Layer.buildWithScope(rpcLayer, scope)
    const rpcHttpEffect = yield* RpcServer.toHttpEffect(exampleRpcGroup).pipe(
      Effect.provide(rpcContext),
      Scope.provide(scope),
    )
    const runtimeContext = yield* Effect.context<Scope.Scope>()

    return HttpEffect.toWebHandlerWith<
      Scope.Scope,
      Scope.Scope | HttpServerRequest.HttpServerRequest
    >(runtimeContext)(HttpMiddleware.logger(rpcHttpEffect))
  },
)
