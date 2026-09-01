import { startExampleRpcServer } from '@effect-rpc-query/server'
import { dehydrate, hydrate } from '@tanstack/react-query'
import { Effect, Exit, Scope } from 'effect'
import { isEffectRpcQueryError } from 'effect-rpc-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  startTanStackStartApplication,
  type TanStackStartApplication,
} from '../src/lib/application.ts'

describe('TanStack Start failed-query hydration', () => {
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
  })

  it('omits a server failure and lets the browser refetch it normally', async () => {
    const server = await Effect.runPromise(
      startExampleRpcServer().pipe(Scope.provide(serverScope!)),
    )
    const serverApplication = await startTanStackStartApplication({ rpcUrl: server.rpcUrl })
    applications.push(serverApplication)
    const serverOptions = serverApplication.rpcQuery.diagnostics.fail.queryOptions()

    await serverApplication.queryClient.prefetchQuery(serverOptions)
    const dehydrated = dehydrate(serverApplication.queryClient)

    expect(serverApplication.queryClient.getQueryState(serverOptions.queryKey)?.status).toBe(
      'error',
    )
    expect(dehydrated.queries).toEqual([])

    const browserApplication = await startTanStackStartApplication({ rpcUrl: server.rpcUrl })
    applications.push(browserApplication)
    hydrate(browserApplication.queryClient, dehydrated)
    const browserOptions = browserApplication.rpcQuery.diagnostics.fail.queryOptions()

    expect(browserApplication.queryClient.getQueryState(browserOptions.queryKey)).toBeUndefined()
    await expect(browserApplication.queryClient.fetchQuery(browserOptions)).rejects.toSatisfy(
      isEffectRpcQueryError,
    )
  })
})
