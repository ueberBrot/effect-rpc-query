# Changesets

Add a real Changeset when a pull request changes the published package's runtime behavior, types,
exports, peer or runtime dependency ranges, or installation-affecting metadata:

```sh
vp run changeset
```

Choose the pre-1.0 bump deliberately and describe the consumer-visible change. The version workflow
formats generated changelogs and manifests through Vite+'s Oxfmt task, and the Changeset Bot leaves
an advisory pull-request comment when changes to `src/**` or the root `package.json` may need one.

Documentation, examples, tests, internal tooling, and CI do not require a Changeset. Do not add an
empty Changeset as a process marker; explain an intentional omission during review instead.

Only the root `effect-rpc-query` package is versioned and published. The private example workspace
packages remain unversioned.
