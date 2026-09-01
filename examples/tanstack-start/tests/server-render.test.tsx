import { startExampleRpcServer } from '@effect-rpc-query/server'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { Effect, Exit, Scope } from 'effect'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTanStackStartRouter } from '../src/router.tsx'

describe('TanStack Start server rendering', () => {
  let serverScope: Scope.Closeable | undefined

  beforeEach(async () => {
    serverScope = await Effect.runPromise(Scope.make())
  })

  afterEach(async () => {
    if (serverScope !== undefined) {
      await Effect.runPromise(Scope.close(serverScope, Exit.void))
    }
  })

  it('loads generated options through QueryClient before rendering query data', async () => {
    const server = await Effect.runPromise(
      startExampleRpcServer().pipe(Scope.provide(serverScope!)),
    )
    const router = await createTanStackStartRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      rpcUrl: server.rpcUrl,
    })

    try {
      await router.load()
      const html = renderToString(<RouterProvider router={router} />)
      const { queryClient, rpcQuery } = router.options.context

      expect(html).toContain('Ada Lovelace')
      expect(html).toContain('Edsger Dijkstra')
      expect(queryClient.getQueryData(rpcQuery.users.list.queryKey())).toHaveLength(2)
    } finally {
      await router.options.context.dispose()
    }
  })
})
