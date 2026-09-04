// @vitest-environment jsdom

import { startExampleRpcServer } from '@effect-rpc-query/server'
import { dehydrate } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Effect, Exit, Scope } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  startTanStackStartApplication,
  type TanStackStartApplication,
} from '../src/lib/application.ts'
import { createTanStackStartRouter } from '../src/router.tsx'

describe('TanStack Start hydration and client navigation', () => {
  let browserApplication: TanStackStartApplication | undefined
  let serverApplication: TanStackStartApplication | undefined
  let serverScope: Scope.Closeable | undefined

  beforeEach(async () => {
    window.scrollTo = () => undefined
    serverScope = await Effect.runPromise(Scope.make())
  })

  afterEach(async () => {
    cleanup()
    await browserApplication?.dispose()
    await serverApplication?.dispose()
    if (serverScope !== undefined) {
      await Effect.runPromise(Scope.close(serverScope, Exit.void))
    }
  })

  it('hydrates without a duplicate query, navigates, mutates, and invalidates', async () => {
    const server = await Effect.runPromise(
      startExampleRpcServer().pipe(Scope.provide(serverScope!)),
    )
    serverApplication = await startTanStackStartApplication({ rpcUrl: server.rpcUrl })
    const serverOptions = serverApplication.rpcQuery.users.list.queryOptions()
    await serverApplication.queryClient.ensureQueryData(serverOptions)

    browserApplication = await startTanStackStartApplication({ rpcUrl: server.rpcUrl })
    const router = await createTanStackStartRouter({
      application: browserApplication,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      scrollRestoration: false,
    })
    await router.options.hydrate?.({
      dehydratedQueryClient: dehydrate(serverApplication.queryClient),
      queryStream: new ReadableStream({
        start: (controller) => controller.close(),
      }),
    })
    let duplicateListFetches = 0
    const unsubscribe = browserApplication.queryClient.getQueryCache().subscribe((event) => {
      if (
        event.query.queryHash ===
          browserApplication?.queryClient.getQueryCache().find(serverOptions)?.queryHash &&
        event.query.state.fetchStatus === 'fetching'
      ) {
        duplicateListFetches += 1
      }
    })
    await router.load()
    render(<RouterProvider router={router} />)

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
    expect(duplicateListFetches).toBe(0)
    expect(await screen.findByText('Infinite users: Ada Lovelace')).toBeTruthy()
    expect(await screen.findByText('Accumulated diagnostics: first, second')).toBeTruthy()
    expect(await screen.findByText('Live diagnostic: second')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Load next user page' }))
    expect(await screen.findByText('Infinite users: Ada Lovelace, Edsger Dijkstra')).toBeTruthy()

    await act(() => router.navigate({ to: '/details' }))
    expect(await screen.findByRole('heading', { name: 'Featured user' })).toBeTruthy()
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()

    await act(() => router.navigate({ to: '/' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Seed users' }))
    expect(await screen.findByText('Grace Hopper')).toBeTruthy()
    expect(await screen.findByText('Margaret Hamilton')).toBeTruthy()

    unsubscribe()
  })

  it('shows declared failures, cancels queries, and renders the default 404', async () => {
    const server = await Effect.runPromise(
      startExampleRpcServer().pipe(Scope.provide(serverScope!)),
    )
    const router = await createTanStackStartRouter({
      history: createMemoryHistory({ initialEntries: ['/diagnostics'] }),
      rpcUrl: server.rpcUrl,
      scrollRestoration: false,
    })
    browserApplication = router.options.context

    await router.load()
    render(<RouterProvider router={router} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Trigger declared failure' }))
    const failure = await screen.findByRole('alert')
    expect(failure.textContent).toContain('EffectRpcQueryError')
    expect(failure.textContent).toContain('DiagnosticFailure')

    fireEvent.click(screen.getByRole('button', { name: 'Start slow query' }))
    expect(await screen.findByText('Ready to cancel')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel query' }))
    expect(await screen.findByText('Server interruptions: 1')).toBeTruthy()

    await act(() => router.navigate({ to: '/failure' }))
    const refetchedFailure = await screen.findByRole('alert')
    expect(refetchedFailure.textContent).toContain('DiagnosticFailure')

    await act(async () => {
      router.history.push('/missing')
      await router.load()
    })
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
  })
})
