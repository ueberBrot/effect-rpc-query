# effect-rpc-query

Type-safe TanStack Query utilities generated from Effect RPC definitions.

`effect-rpc-query` turns dotted unary RPC tags into a typed utility tree. Its builders produce Query
Core options and semantic cache keys while your application owns the RPC client, Query Client, and
lifecycle.

## Install

```sh
pnpm add effect-rpc-query effect @tanstack/query-core
```

The current source targets Effect 4, TanStack Query 5, strict TypeScript, ESM, and ES2022. The
package is under active development before its first stable release.

## Use

```ts
import { createRpcQueryUtils } from 'effect-rpc-query'

const rpcQuery = createRpcQueryUtils(rpcGroup, {
  client,
  keyPrefix: ['my-app'] as const,
  runPromiseExit,
})

const options = rpcQuery.users.get.queryOptions({ input: { id: 1 } })
```

Read the [documentation](https://ueberbrot.github.io/effect-rpc-query/) for setup, React Query,
TanStack Start, cache keys, cancellation, failures, and the curated API reference.

## Develop

The repository includes executable [Vite React](./examples/vite-react) and
[TanStack Start](./examples/tanstack-start) applications. Run `vp run vite-react-dev` or
`vp run tanstack-start-dev` from the repository root. Run the complete validation suite with
`vp run validate`.

See the [Dev Container guide](https://ueberbrot.github.io/effect-rpc-query/contributing/dev-container/)
for the reproducible environment.
