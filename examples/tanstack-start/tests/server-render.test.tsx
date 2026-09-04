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

  it('renders a cancelled server snapshot from generated query and stream options', async () => {
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
      expect(html).toMatch(/Infinite users:.*Ada Lovelace/)
      expect(html).toContain('Accumulated diagnostics:')
      expect(html).toMatch(/Accumulated diagnostics:.*first/)
      expect(html).toContain('Live diagnostic:')
      expect(html).toMatch(/Live diagnostic:.*first/)
      expect(queryClient.getQueryData(rpcQuery.users.list.queryKey())).toHaveLength(2)
      expect(
        queryClient.getQueryData(rpcQuery.users.page.infiniteKey({ cursor: 0, pageSize: 1 })),
      ).toMatchObject({
        pageParams: [0],
        pages: [{ users: [{ name: 'Ada Lovelace' }] }],
      })
      expect(
        queryClient.getQueryState(rpcQuery.diagnostics.stream.streamedKey())?.fetchStatus,
      ).toBe('idle')
      expect(queryClient.getQueryData(rpcQuery.diagnostics.stream.streamedKey())).toEqual(['first'])
      expect(queryClient.getQueryState(rpcQuery.diagnostics.stream.liveKey())?.fetchStatus).toBe(
        'idle',
      )
      expect(queryClient.getQueryData(rpcQuery.diagnostics.stream.liveKey())).toBe('first')
    } finally {
      await router.options.context.dispose()
    }
  })
})
