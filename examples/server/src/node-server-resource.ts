import { Effect } from 'effect'
import type { Server } from 'node:http'

export const closeNodeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)))
    server.closeIdleConnections()
    server.closeAllConnections()
  })

export const acquireNodeServer = <A, E, R>(server: Server, acquire: Effect.Effect<A, E, R>) =>
  Effect.acquireRelease(acquire, () => Effect.promise(() => closeNodeServer(server)))
