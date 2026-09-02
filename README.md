# effect-rpc-query

Type-safe TanStack Query utilities generated from Effect RPC definitions.

The package is under active development for its first release against the Effect 4 release candidate.

## Plain React example

Start the shared HTTP RPC server and the private Vite React application from the repository root:

```sh
vp run vite-react-dev
```

Vite+ labels each process's output. Open the URL printed by Vite, usually `http://localhost:5173`,
and press `Ctrl+C` to stop both processes. The development server proxies `/rpc` to
`http://127.0.0.1:3001`.

Build the application with `vp run vite-react-build`. Set `VITE_RPC_URL` when the browser must use
another RPC URL.

## TanStack Start example

Start the shared HTTP RPC server and the private TanStack Start application from the repository
root:

```sh
vp run tanstack-start-dev
```

Open `http://127.0.0.1:3000`, and press `Ctrl+C` to stop both processes. The development server
proxies browser requests from `/rpc` to `http://127.0.0.1:3001`. Server rendering connects directly
to the RPC server.

Build the application with `vp run tanstack-start-build`. Set `EXAMPLE_RPC_URL` to change the RPC
URL used during server rendering. Set `VITE_RPC_URL` to change the URL used in the browser.

## Browser acceptance tests

Install the browsers and their operating-system dependencies once:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
```

Run the fast Chromium suite with `vp run e2e:chromium`. Run the complete Chromium, Firefox, and
WebKit suite with `vp run e2e`. Playwright builds and starts the shared RPC server and both
applications through root Vite+ tasks, then stops every process when the run finishes.

## Optional Dev Container

Prerequisites:

- Docker
- VS Code with the Dev Containers extension, or another Dev Container client

Open the repository in VS Code and run **Dev Containers: Reopen in Container**. The container uses
the declared Node and pnpm versions and installs the frozen workspace.

Run the example and test commands above from the attached terminal. The client forwards ports `3000`
(TanStack Start), `3001` (RPC), `4173` (Vite preview), and `5173` (Vite development).

Verify the toolchain and run all validation tasks:

```sh
node --version
pnpm --version
vp --version
vp run validate
```

When updating Node, update `.node-version` and the Dev Container image, then rebuild the container.
Rebuild after changing `packageManager` too.
