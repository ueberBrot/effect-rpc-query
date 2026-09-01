import {
  type ExampleRpcQueryUtils,
  startExampleReactApplication,
} from '@effect-rpc-query/example-react'
import { QueryClient } from '@tanstack/react-query'

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
}: StartViteReactApplicationOptions): Promise<ViteReactApplication> =>
  startExampleReactApplication({
    keyPrefix: 'vite-react',
    queryClient: new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    }),
    rpcUrl,
  })
