import '@tanstack/react-start/server-only'
import { makeExampleRpcWebHandler } from '@effect-rpc-query/server/web-handler'
import { getRouterInstance } from '@tanstack/react-start'
import { Effect, Exit, Scope } from 'effect'

const rpcScope = Scope.makeUnsafe()
const rpcHandler = Effect.runPromise(makeExampleRpcWebHandler().pipe(Scope.provide(rpcScope)))
let disposal: Promise<void> | undefined

const disposeRpcHandler = (): Promise<void> => {
  disposal ??= Effect.runPromise(Scope.close(rpcScope, Exit.void))
  return disposal
}

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => void disposeRpcHandler())
}

/** Serves Effect RPC for the lifetime of this TanStack Start server module. */
export const handleRpcRequest = async (request: Request): Promise<Response> => {
  const router = await getRouterInstance()
  try {
    const handler = await rpcHandler
    return await handler(request)
  } finally {
    // Server routes bypass SSR cleanup. Release the ready RPC client created with the router.
    await router.options.context.dispose()
  }
}
