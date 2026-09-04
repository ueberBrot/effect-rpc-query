// fallow-ignore-file unused-file
// This packed fixture verifies that every generated operation fits one TanStack Start route.
import { QueryClient } from '@tanstack/query-core'
import { useInfiniteQuery, useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { createStart } from '@tanstack/react-start'

import type { PublicContractUtils } from './public-contract.js'

interface RouterContext {
  readonly queryClient: QueryClient
  readonly rpcQuery: PublicContractUtils
}

const rootRoute = createRootRouteWithContext<RouterContext>()()

const indexRoute = createRoute({
  component: () => {
    const { rpcQuery } = indexRoute.useRouteContext()

    useQuery(rpcQuery.users.get.queryOptions({ input: { id: 1 } }))
    useMutation(rpcQuery.users.get.mutationOptions())
    useInfiniteQuery(
      rpcQuery.users.pages.infiniteOptions({
        getNextPageParam: (lastPage: { readonly nextCursor: number | null }) =>
          lastPage.nextCursor ?? undefined,
        initialPageParam: 0,
        input: (cursor: number) => ({ cursor }),
      }),
    )
    useSuspenseQuery(rpcQuery.events.audit.watch.streamedOptions())
    useSuspenseQuery(rpcQuery.projects.watch.liveOptions())

    return null
  },
  getParentRoute: () => rootRoute,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        context.rpcQuery.users.get.queryOptions({ input: { id: 1 } }),
      ),
      context.queryClient.ensureInfiniteQueryData(
        context.rpcQuery.users.pages.infiniteOptions({
          getNextPageParam: (lastPage: { readonly nextCursor: number | null }) =>
            lastPage.nextCursor ?? undefined,
          initialPageParam: 0,
          input: (cursor: number) => ({ cursor }),
        }),
      ),
      context.queryClient.ensureQueryData(context.rpcQuery.events.audit.watch.streamedOptions()),
      context.queryClient.ensureQueryData(context.rpcQuery.projects.watch.liveOptions()),
    ])
  },
  path: '/',
})

const routeTree = rootRoute.addChildren([indexRoute])
declare const context: RouterContext
const router = createRouter({ context, routeTree })

setupRouterSsrQueryIntegration({ queryClient: context.queryClient, router })
createStart(() => ({}))
