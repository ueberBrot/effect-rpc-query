import { exampleRpcGroup } from '@effect-rpc-query/contracts'
import { type ExampleRpcClient, startExampleRpcClient } from '@effect-rpc-query/contracts/client'
import { QueryClient } from '@tanstack/react-query'
import { createRpcQueryUtils, type RunPromiseExit } from 'effect-rpc-query'

const makeExampleRpcQueryUtils = (client: ExampleRpcClient, runPromiseExit: RunPromiseExit) =>
  createRpcQueryUtils(exampleRpcGroup, {
    client,
    keyPrefix: ['tanstack-start'] as const,
    runPromiseExit,
  })

export type ExampleRpcQueryUtils = ReturnType<typeof makeExampleRpcQueryUtils>

export interface TanStackStartApplication {
  readonly dispose: () => Promise<void>
  readonly queryClient: QueryClient
  readonly rpcQuery: ExampleRpcQueryUtils
}

export interface StartTanStackStartApplicationOptions {
  readonly rpcUrl: string
}

/** Acquires every caller-owned runtime resource used by one Start router. */
export const startTanStackStartApplication = async ({
  rpcUrl,
}: StartTanStackStartApplicationOptions): Promise<TanStackStartApplication> => {
  const rpcClient = await startExampleRpcClient(rpcUrl)
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: 60_000 },
    },
  })
  let disposal: Promise<void> | undefined
  const dispose = () => {
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
