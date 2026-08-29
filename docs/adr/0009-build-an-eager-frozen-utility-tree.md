# Build an eager frozen utility tree

The factory enumerates the RPC group's request map and eagerly builds an ordinary frozen object rather than a Proxy or generated source. Eager construction keeps the object inspectable, avoids Promise and serialization traps, and validates the prefix, paths, collisions, and key-encoder configuration atomically before returning a tree. Prefixes, keys, and canonical payloads are frozen; generated option objects remain fresh and unfrozen, and caller-owned option values remain untouched.
