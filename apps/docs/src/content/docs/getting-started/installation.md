---
title: Installation
description: Install effect-rpc-query and its peer dependencies.
---

Install the package with Effect and TanStack Query Core:

```sh
pnpm add effect-rpc-query effect @tanstack/query-core
```

React applications also need the React adapter:

```sh
pnpm add @tanstack/react-query
```

## Compatibility

The current source is tested with the Effect `4.0.0-rc.111` release candidate and TanStack Query
`5.102.x`. Strict TypeScript 5.9 is the compiler floor; packed consumers are checked with TypeScript
5.9 and 7. The published peer range for Query Core is `>=5.102.0 <6`.

The package is ESM-only and targets ES2022. It is under active development before its first stable
release, so minor releases can change the API.

Continue with the [quick start](/effect-rpc-query/getting-started/quick-start/), or review all
[compatibility constraints](/effect-rpc-query/reference/compatibility-and-limits/).
