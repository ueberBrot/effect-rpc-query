import {
  defaultShouldDehydrateQuery,
  hydrate as hydrateQueryClient,
  type DehydratedState,
  type QueryClient,
} from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

interface DehydratedRouterQueryState {
  readonly dehydratedQueryClient?: DehydratedState
  readonly queryStream: ReadableStream<DehydratedState>
}

/** Configures QueryClient hydration, including Effect Schema class serialization. */
export const setupQuerySsr = <TRouter extends AnyRouter>(
  router: TRouter,
  queryClient: QueryClient,
): void => {
  const originalHydrate = router.options.hydrate

  setupRouterSsrQueryIntegration({
    dehydrateOptions: {
      serializeData: (data) => structuredClone(data),
      shouldDehydrateQuery: defaultShouldDehydrateQuery,
    },
    queryClient,
    router,
  })

  if (router.isServer) return

  // The current mature helper hydrates the terminal stream value before checking `done`.
  // Keep its provider and redirect integration, but read its dehydrated stream safely.
  router.options.hydrate = async (dehydrated: DehydratedRouterQueryState) => {
    await originalHydrate?.(dehydrated)
    if (dehydrated.dehydratedQueryClient !== undefined) {
      hydrateQueryClient(queryClient, dehydrated.dehydratedQueryClient)
    }

    const reader = dehydrated.queryStream.getReader()
    const hydrateNext = async (): Promise<void> => {
      const next = await reader.read()
      if (next.done) return
      hydrateQueryClient(queryClient, next.value)
      await hydrateNext()
    }
    void hydrateNext().catch((error: unknown) => {
      console.error('Error reading query stream:', error)
    })
  }
}
