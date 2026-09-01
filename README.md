# effect-rpc-query

Type-safe TanStack Query utilities generated from Effect RPC definitions.

The package is under active development for its first release against the Effect 4 release candidate.

## Plain React example

Run the shared HTTP RPC server and the private Vite React application in separate terminals:

```sh
vp run server
vp run vite-react
```

Build the application with `vp run vite-react-build`. The development server proxies `/rpc` to
`http://127.0.0.1:3001`. Set `VITE_RPC_URL` when the browser must use another RPC URL.
