import { createFileRoute } from '@tanstack/react-router'

import { handleRpcRequest } from '../lib/rpc-server.ts'

export const Route = createFileRoute('/rpc')({
  server: {
    handlers: {
      POST: ({ request }) => handleRpcRequest(request),
    },
  },
})
