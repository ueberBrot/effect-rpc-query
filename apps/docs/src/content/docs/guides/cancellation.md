---
title: Cancellation
description: Forward TanStack query cancellation to an Effect RPC runner.
---

Generated query functions forward TanStack’s `AbortSignal` to `runPromiseExit`:

```ts
const runPromiseExit: RunPromiseExit = (effect, options) => runtime.runPromiseExit(effect, options)
```

Cancel one request with its generated query key:

```ts
const input = { durationMs: 60_000, operationId: 'slow-query' }

void queryClient.query(rpcQuery.diagnostics.slow.queryOptions({ input }))

await queryClient.cancelQueries({
  queryKey: rpcQuery.diagnostics.slow.queryKey(input),
})
```

TanStack aborts the signal. The runner must translate that abort into Effect interruption, and the
RPC transport must support interruption if the server operation should stop. `effect-rpc-query`
does not add a transport-specific cancellation protocol.

Mutations do not receive TanStack query signals, so the generated mutation function provides no
automatic mutation cancellation helper.
