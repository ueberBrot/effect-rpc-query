---
title: Executable Examples
description: Run the repository's React Query and TanStack Start applications.
---

The repository contains two complete applications. Both use the same contracts and Effect RPC
handler implementation, but each hosts HTTP differently.

| Example                                                                                           | Demonstrates                                                             | RPC host                                          | Application URL         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- | ----------------------- |
| [Vite React](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/vite-react)         | React Query hooks, mutations, invalidation, failures, and cancellation   | Standalone server on port `3001`, proxied by Vite | `http://127.0.0.1:5173` |
| [TanStack Start](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/tanstack-start) | Loaders, server rendering, dehydration, hydration, and client navigation | Same-origin `POST /rpc` server route              | `http://127.0.0.1:3000` |

## Run Vite React

```sh
vp run vite-react-dev
```

This task starts both the standalone RPC server and the Vite development server.

## Run TanStack Start

```sh
vp run tanstack-start-dev
```

This task starts one full-stack process. The browser and server-rendering client both call the
Start-owned `/rpc` route.

## Build the examples

Build either application without starting it:

```sh
vp run vite-react-build
vp run tanstack-start-build
```

## Browser playground status

The examples do not currently run in StackBlitz WebContainers. Vite+ requires a native binding
that is unavailable there. [Issue #33](https://github.com/ueberBrot/effect-rpc-query/issues/33)
records the decision, and the
[minimal reproduction](https://github.com/ueberBrot/vite-plus-webcontainer-repro) tracks the
upstream limitation. The repository examples remain the executable source of truth.
