---
title: Executable Examples
description: Run the repository's React Query and TanStack Start applications.
---

The repository contains two complete applications. Both use the same contracts and Effect RPC
handler implementation, but each hosts HTTP differently.

| Example                                                                                           | Demonstrates                                                                                         | RPC host                                          | Application URL         |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------- |
| [Vite React](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/vite-react)         | Ordinary, infinite, accumulated-stream, live, and mutation hooks with failures and cancellation      | Standalone server on port `3001`, proxied by Vite | `http://127.0.0.1:5173` |
| [TanStack Start](https://github.com/ueberBrot/effect-rpc-query/tree/main/examples/tanstack-start) | The same operation kinds in loaders, server rendering, dehydration, hydration, and client navigation | Same-origin `POST /rpc` server route              | `http://127.0.0.1:3000` |

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

Server rendering uses `http://127.0.0.1:3000/rpc`. If the Start server listens elsewhere, set the
server-only `EXAMPLE_RPC_ORIGIN` environment variable to its trusted HTTP(S) origin, without a path,
credentials, query, or fragment. Incoming `Host` and forwarded headers do not select the RPC
destination. The browser uses the relative `/rpc` endpoint.

Both examples reject RPC bodies larger than 1 MiB with HTTP 413. The shared handler counts bytes as
they arrive, including chunked requests, before invoking RPC handlers. The standalone server returns
HTTP 400 for malformed request targets.

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
upstream limitation. Run either example locally or in the Dev Container.
