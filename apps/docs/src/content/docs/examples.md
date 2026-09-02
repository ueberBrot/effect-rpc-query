---
title: Executable Examples
description: Run the repository's React Query and TanStack Start applications.
---

The repository contains two complete applications backed by the same Effect RPC server:

- [Vite React](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/vite-react) shows
  React Query hooks, mutations, invalidation, failures, and cancellation.
- [TanStack Start](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/tanstack-start)
  adds route loaders, server rendering, dehydration, and browser hydration.

Run either application with its RPC server from the repository root:

```sh
vp run vite-react-dev
vp run tanstack-start-dev
```

Build them without starting a server:

```sh
vp run vite-react-build
vp run tanstack-start-build
```

## Browser playground status

The examples do not currently run in StackBlitz WebContainers. Vite+ `0.2.9` requires a native
binding that is unavailable there. [Issue #33](https://github.com/ueberBrot/effect-rpc-query/issues/33)
records the decision, and the
[minimal reproduction](https://github.com/ueberBrot/vite-plus-webcontainer-repro) tracks the
upstream limitation. The repository examples remain the executable source of truth.
