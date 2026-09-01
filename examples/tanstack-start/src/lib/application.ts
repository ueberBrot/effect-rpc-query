import {
  type ExampleRpcQueryUtils,
  startExampleReactApplication,
} from '@effect-rpc-query/example-react'
import { QueryClient } from '@tanstack/react-query'

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
}: StartTanStackStartApplicationOptions): Promise<TanStackStartApplication> =>
  startExampleReactApplication({
    keyPrefix: 'tanstack-start',
    queryClient: new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false, staleTime: 60_000 },
      },
    }),
    rpcUrl,
  })
