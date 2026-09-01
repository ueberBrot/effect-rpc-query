import { startExampleRpcServer } from '@effect-rpc-query/server'
import { createMemoryHistory } from '@tanstack/react-router'
import { attachRouterServerSsrUtils } from '@tanstack/react-start/server'
import { Effect, Exit, Scope } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TanStackStartApplication } from '../src/lib/application.ts'
import { createTanStackStartRouter } from '../src/router.tsx'

describe('TanStack Start router dehydration', () => {
  const applications: Array<TanStackStartApplication> = []
  let serverScope: Scope.Closeable | undefined

  beforeEach(async () => {
    serverScope = await Effect.runPromise(Scope.make())
  })

  afterEach(async () => {
    await Promise.all(applications.splice(0).map(({ dispose }) => dispose()))
    if (serverScope !== undefined) {
      await Effect.runPromise(Scope.close(serverScope, Exit.void))
    }
    vi.unstubAllGlobals()
  })

  it('round-trips successful query data through the router hooks without refetching', async () => {
    const server = await Effect.runPromise(
      startExampleRpcServer().pipe(Scope.provide(serverScope!)),
    )
    const serverRouter = await createTanStackStartRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      rpcUrl: server.rpcUrl,
      scrollRestoration: false,
    })
    const serverApplication = serverRouter.options.context
    applications.push(serverApplication)
    attachRouterServerSsrUtils({ manifest: undefined, router: serverRouter })

    await serverRouter.load()
    const dehydrated = await serverRouter.options.dehydrate?.()
    if (dehydrated === undefined) throw new Error('Router dehydration is not configured')
    serverRouter.serverSsr?.setRenderFinished()

    const browserWindow = Object.assign(new EventTarget(), { origin: 'http://localhost' })
    vi.stubGlobal('window', browserWindow)
    const browserRouter = await createTanStackStartRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      isServer: false,
      rpcUrl: server.rpcUrl,
      scrollRestoration: false,
    })
    const browserApplication = browserRouter.options.context
    applications.push(browserApplication)
    const usersOptions = browserApplication.rpcQuery.users.list.queryOptions()
    let duplicateFetches = 0
    const unsubscribe = browserApplication.queryClient.getQueryCache().subscribe((event) => {
      if (
        event.query.queryHash ===
          browserApplication.queryClient.getQueryCache().find(usersOptions)?.queryHash &&
        event.query.state.fetchStatus === 'fetching'
      ) {
        duplicateFetches += 1
      }
    })

    await browserRouter.options.hydrate?.(dehydrated)
    await browserRouter.load()

    expect(browserApplication.queryClient.getQueryData(usersOptions.queryKey)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Ada Lovelace' })]),
    )
    expect(duplicateFetches).toBe(0)
    unsubscribe()
    serverRouter.serverSsr?.cleanup()
  })

  it('loads the failure route but omits its failed query from router dehydration', async () => {
    const server = await Effect.runPromise(
      startExampleRpcServer().pipe(Scope.provide(serverScope!)),
    )
    const router = await createTanStackStartRouter({
      history: createMemoryHistory({ initialEntries: ['/failure'] }),
      rpcUrl: server.rpcUrl,
      scrollRestoration: false,
    })
    const application = router.options.context
    applications.push(application)
    attachRouterServerSsrUtils({ manifest: undefined, router })

    await router.load()
    const failureOptions = application.rpcQuery.diagnostics.fail.queryOptions()
    const dehydrated = await router.options.dehydrate?.()

    expect(application.queryClient.getQueryState(failureOptions.queryKey)?.status).toBe('error')
    expect(dehydrated).not.toHaveProperty('dehydratedQueryClient')
    router.serverSsr?.cleanup()
  })
})
