// @vitest-environment jsdom

import { startExampleRpcServer } from '@effect-rpc-query/server'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Effect, Exit, Scope } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ViteReactExample } from '../src/App.tsx'
import { startViteReactApplication, type ViteReactApplication } from '../src/lib/application.ts'

describe('plain Vite React integration', () => {
  let application: ViteReactApplication | undefined
  let serverScope: Scope.Closeable | undefined

  beforeEach(async () => {
    serverScope = await Effect.runPromise(Scope.make())
    const server = await Effect.runPromise(startExampleRpcServer().pipe(Scope.provide(serverScope)))
    application = await startViteReactApplication({ rpcUrl: server.rpcUrl })
    render(<ViteReactExample application={application} />)
  })

  afterEach(async () => {
    cleanup()
    await application?.dispose()
    if (serverScope !== undefined) {
      await Effect.runPromise(Scope.close(serverScope, Exit.void))
    }
  })

  it('uses generated options with ordinary, suspense, and mutation hooks', async () => {
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
    expect(await screen.findByText('Featured: Ada Lovelace')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reuse cached list' }))
    expect(await screen.findByText('Reused 2 cached users')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Run void query' }))
    expect(await screen.findByText('Void query returned null')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reset list' }))
    expect(await screen.findByText('Void mutation returned undefined')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger declared failure' }))
    const failure = await screen.findByRole('alert')
    expect(failure.textContent).toContain('EffectRpcQueryError')
    expect(failure.textContent).toContain('diagnostics.fail')
    expect(failure.textContent).toContain('DiagnosticFailure')
  })

  it('seeds and invalidates user queries through generated keys', async () => {
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Load sample users' }))
    expect(await screen.findByText('Grace Hopper')).toBeTruthy()
    expect(screen.getByText('Margaret Hamilton')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Invalidate user cache' }))
    expect(await screen.findByText('User cache invalidated')).toBeTruthy()
  })

  it('adds the user details submitted through the form', async () => {
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Katherine Johnson' },
    })
    fireEvent.change(screen.getByLabelText('Locale (optional)'), {
      target: { value: 'fr' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))

    expect(await screen.findByText('Added Katherine Johnson')).toBeTruthy()
    expect(await screen.findByText('Katherine Johnson')).toBeTruthy()
    expect(screen.getByText('User 3, locale fr')).toBeTruthy()
  })

  it('deletes the user selected from the rendered list', async () => {
    expect(await screen.findByText('Edsger Dijkstra')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Edsger Dijkstra' }))

    await waitFor(() => {
      expect(screen.queryByText('Edsger Dijkstra')).toBeNull()
    })
  })

  it('cancels a started slow query and observes server-side interruption', async () => {
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Start slow query' }))
    expect(await screen.findByText('Ready to cancel')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel query' }))
    expect(await screen.findByText('Server recorded 1 interruption')).toBeTruthy()
  })

  it('disposes its client Scope and runtime idempotently', async () => {
    const ownedApplication = application
    expect(ownedApplication).toBeDefined()
    await Promise.all([ownedApplication?.dispose(), ownedApplication?.dispose()])

    await waitFor(() => {
      expect(ownedApplication?.queryClient.isFetching()).toBe(0)
    })
  })
})
