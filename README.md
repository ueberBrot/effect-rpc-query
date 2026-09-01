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
