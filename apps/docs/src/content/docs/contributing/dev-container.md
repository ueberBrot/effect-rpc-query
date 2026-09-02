---
title: Dev Container
description: Work on effect-rpc-query in its reproducible development container.
---

Install Docker and a Dev Container client, then open the repository and choose **Dev Containers:
Reopen in Container** in VS Code.

The container installs the declared Node and pnpm versions with the frozen workspace. It forwards
ports `3000`, `3001`, `4173`, and `5173` for the examples and previews.

Start either executable application with its shared RPC server:

```sh
vp run vite-react-dev
vp run tanstack-start-dev
```

Verify the toolchain and repository from the attached terminal:

```sh
node --version
pnpm --version
vp --version
vp run validate
```

Run the documentation site with `vp run docs`. Build and check it with:

```sh
vp run docs-check
vp run docs-build
```

When updating Node, change both `.node-version` and the Dev Container image, then rebuild the
container. Rebuild it after changing the root `packageManager` value too.
