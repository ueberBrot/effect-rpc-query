import { exampleRpcGroup } from '@effect-rpc-query/contracts'
import { type ExampleRpcClient, startExampleRpcClient } from '@effect-rpc-query/contracts/client'
import { QueryClient } from '@tanstack/react-query'
import { createRpcQueryUtils, type RunPromiseExit } from 'effect-rpc-query'

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

/** Keeps the complete, caller-owned integration visible at the application seam. */
export const startViteReactApplication = async ({
  rpcUrl,
}: StartViteReactApplicationOptions): Promise<ViteReactApplication> => {
  const rpcClient = await startExampleRpcClient(rpcUrl)
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  let disposal: Promise<void> | undefined
  const dispose = () => {
    // Stop queries before releasing the ready RPC client they execute through.
    disposal ??= (async () => {
      try {
        await queryClient.cancelQueries()
      } finally {
        queryClient.clear()
        await rpcClient.dispose()
      }
    })()
    return disposal
  }

  try {
    return {
      dispose,
      queryClient,
      rpcQuery: makeExampleRpcQueryUtils(
        rpcClient.client,
        rpcClient.runPromiseExit satisfies RunPromiseExit,
      ),
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
