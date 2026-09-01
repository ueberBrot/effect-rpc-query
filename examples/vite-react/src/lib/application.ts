import { exampleRpcGroup } from '@effect-rpc-query/contracts'
import { type ExampleRpcClient, makeExampleRpcClient } from '@effect-rpc-query/contracts/client'
import { QueryClient } from '@tanstack/react-query'
import { Effect, Exit, Layer, ManagedRuntime, Scope } from 'effect'
import { createRpcQueryUtils, type RunPromiseExit } from 'effect-rpc-query'
import { RpcClient } from 'effect/unstable/rpc'

const makeExampleRpcQueryUtils = (client: ExampleRpcClient, runPromiseExit: RunPromiseExit) =>
  createRpcQueryUtils(exampleRpcGroup, {
    client,
    keyPrefix: ['vite-react'] as const,
    runPromiseExit,
  })

export type ExampleRpcQueryUtils = ReturnType<typeof makeExampleRpcQueryUtils>

export interface ViteReactApplication {
  readonly dispose: () => Promise<void>
  readonly queryClient: QueryClient
  readonly rpcQuery: ExampleRpcQueryUtils
}

export interface StartViteReactApplicationOptions {
  readonly rpcUrl: string
}

/** Acquires every caller-owned runtime resource used by the React application. */
export const startViteReactApplication = async ({
  rpcUrl,
}: StartViteReactApplicationOptions): Promise<ViteReactApplication> => {
  const clientScope = await Effect.runPromise(Scope.make())
  const runtime = ManagedRuntime.make(Layer.empty)
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  let disposal: Promise<void> | undefined
  const dispose = () => {
    disposal ??= (async () => {
      try {
        await queryClient.cancelQueries()
      } finally {
        queryClient.clear()
        await Promise.all([
          Effect.runPromise(Scope.close(clientScope, Exit.void)),
          runtime.dispose(),
        ])
      }
    })()
    return disposal
  }

  try {
    const client = await runtime.runPromise(
      makeExampleRpcClient(rpcUrl).pipe(Scope.provide(clientScope)),
    )
    const runPromiseExit: RunPromiseExit = (effect, options) =>
      runtime.runPromiseExit(
        RpcClient.withHeaders(effect, {
          'x-example-authorization': 'allowed',
        }),
        options,
      )
    const rpcQuery = makeExampleRpcQueryUtils(client, runPromiseExit)

    return {
      dispose,
      queryClient,
      rpcQuery,
    }
  } catch (cause) {
    try {
      await dispose()
    } catch (cleanupCause) {
      throw new AggregateError([cause, cleanupCause], 'Application startup and cleanup failed')
    }
    throw cause
  }
}
