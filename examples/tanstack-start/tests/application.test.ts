import { startExampleRpcServer } from '@effect-rpc-query/server'
import { Effect, Exit, Scope } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  startTanStackStartApplication,
  type TanStackStartApplication,
} from '../src/lib/application.ts'

describe('TanStack Start application ownership', () => {
  let application: TanStackStartApplication | undefined
  let serverScope: Scope.Closeable | undefined

  beforeEach(async () => {
    serverScope = await Effect.runPromise(Scope.make())
    const server = await Effect.runPromise(startExampleRpcServer().pipe(Scope.provide(serverScope)))
    application = await startTanStackStartApplication({ rpcUrl: server.rpcUrl })
  })

  afterEach(async () => {
    await application?.dispose()
    if (serverScope !== undefined) {
      await Effect.runPromise(Scope.close(serverScope, Exit.void))
    }
  })

  it('keeps a ready RPC client alive until idempotent disposal', async () => {
    const ownedApplication = application
    expect(ownedApplication).toBeDefined()
    if (ownedApplication === undefined) return

    const options = ownedApplication.rpcQuery.users.list.queryOptions()
    const users = await ownedApplication.queryClient.ensureQueryData(options)

    expect(users).toHaveLength(12)
    expect(users[0]?.name).toBe('Ada Lovelace')
    expect(users[11]?.name).toBe('James Gosling')
    expect(ownedApplication.queryClient.getQueryData(options.queryKey)).toEqual(users)

    await Promise.all([ownedApplication.dispose(), ownedApplication.dispose()])

    expect(ownedApplication.queryClient.getQueryData(options.queryKey)).toBeUndefined()
  })
})
