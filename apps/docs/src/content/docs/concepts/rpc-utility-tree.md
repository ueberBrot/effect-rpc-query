---
title: RPC Utility Tree
description: Understand how RPC tags become nested query utilities.
---

`createRpcQueryUtils` eagerly projects dotted unary RPC tags into one frozen RPC utility tree:

| RPC tag                    | Generated path                            |
| -------------------------- | ----------------------------------------- |
| `users.get`                | `rpcQuery.users.get`                      |
| `projects.by-id.find`      | `rpcQuery.projects['by-id'].find`         |
| `billing-history.list all` | `rpcQuery['billing-history']['list all']` |

Each branch has `key()`. Each leaf adds query and mutation key and option builders. The tree is built
once, so invalid tags, collisions, and encoder configuration fail during factory construction.

Streaming RPCs are omitted because TanStack Query represents finite query and mutation results.
Branches left empty after stream omission are absent too.

Reserved builder names cannot appear where they would collide with generated members. See
[Generated Builders](/effect-rpc-query/reference/generated-builders/) for the leaf interface.
