import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import { RpcClient, RpcClientError, RpcGroup, RpcSerialization } from 'effect/unstable/rpc'

import { exampleRpcGroup } from './contracts.ts'

export type ExampleRpcClient = RpcClient.RpcClient.Flat<
  RpcGroup.Rpcs<typeof exampleRpcGroup>,
  RpcClientError.RpcClientError
>

/** Acquires a caller-owned, scoped flat client for the example HTTP server. */
export const makeExampleRpcClient = Effect.fn('ExampleRpc.makeExampleRpcClient')(function* (
  rpcUrl: string,
) {
  const protocolLayer = RpcClient.layerProtocolHttp({ url: rpcUrl }).pipe(
    Layer.provide(RpcSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  )

  const client = yield* RpcClient.make(exampleRpcGroup, { flatten: true }).pipe(
    Effect.provide(protocolLayer),
  )
  let nextSlowOperation = 1

  return ((tag: string, payload: unknown, options?: unknown) => {
    if (tag !== 'diagnostics.slow') {
      return Reflect.apply(client, undefined, [tag, payload, options])
    }

    const slowPayload = payload as {
      readonly durationMs?: number
      readonly operationId?: string
    }
    const operationId =
      slowPayload.operationId ?? `${globalThis.crypto.randomUUID()}-${String(nextSlowOperation++)}`

    // The buffered HTTP protocol cannot carry a caller's interruption after sending a request.
    return client('diagnostics.slow', { ...slowPayload, operationId }, options as never).pipe(
      Effect.onInterrupt(() =>
        client('diagnostics.cancel', { operationId }).pipe(
          Effect.ignoreCause({ log: true, message: 'Failed to cancel example slow operation' }),
        ),
      ),
    )
  }) as ExampleRpcClient
})
