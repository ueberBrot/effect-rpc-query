// fallow-ignore-file unused-file
// Vite+ invokes this verifier through its dynamically declared packed-package task.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactDirectory = join(repositoryRoot, '.artifacts')
const tarballName = readdirSync(artifactDirectory).find((name) =>
  /^effect-rpc-query-.*\.tgz$/.test(name),
)

if (tarballName === undefined) {
  throw new Error('No effect-rpc-query tarball exists in .artifacts')
}

const consumerDirectory = mkdtempSync(join(tmpdir(), 'effect-rpc-query-'))

try {
  writeFileSync(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'effect-rpc-query-packed-consumer',
        private: true,
        type: 'module',
        dependencies: {
          '@tanstack/query-core': '5.102.0',
          '@types/node': '24.13.3',
          effect: '4.0.0-rc.111',
          'effect-rpc-query': `file:${join(artifactDirectory, tarballName)}`,
        },
      },
      null,
      2,
    ),
  )
  // Match the repository lockfile instead of re-resolving Effect's broad range.
  writeFileSync(join(consumerDirectory, 'pnpm-workspace.yaml'), "overrides:\n  msgpackr: '2.0.5'\n")

  // Prefer cached artifacts, but allow a fresh machine to fetch exact pinned versions.
  // The temporary project must resolve every peer from its own node_modules.
  execFileSync('pnpm', ['install', '--ignore-scripts', '--prefer-offline'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  })

  writeFileSync(
    join(consumerDirectory, 'runtime.mts'),
    `import * as rpcQuery from 'effect-rpc-query'
import { skipToken } from '@tanstack/query-core'

const expectedExports = [
  'EffectRpcQueryConfigError',
  'EffectRpcQueryError',
  'EffectRpcQueryKeyError',
  'createRpcQueryUtils',
  'isEffectRpcQueryError',
  'skipToken',
] as const satisfies ReadonlyArray<keyof typeof rpcQuery>

if (JSON.stringify(Object.keys(rpcQuery).sort()) !== JSON.stringify(expectedExports)) {
  throw new Error('The package root exposed an unexpected runtime surface')
}
if (rpcQuery.skipToken !== skipToken) {
  throw new Error('The package returned a different skipToken instance')
}
`,
  )

  // Reuse the full contract fixture, but resolve the library as an installed package.
  const fixture = readFileSync(
    join(repositoryRoot, 'tests/types/technical-spine.ts'),
    'utf8',
  ).replace("from '#effect-rpc-query'", "from 'effect-rpc-query'")
  writeFileSync(join(consumerDirectory, 'technical-spine.ts'), fixture)
  writeFileSync(
    join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          exactOptionalPropertyTypes: true,
          lib: ['ES2022', 'DOM', 'DOM.Iterable', 'ESNext.Disposable'],
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2022',
          types: ['node'],
        },
        include: ['runtime.mts', 'technical-spine.ts'],
      },
      null,
      2,
    ),
  )

  for (const compiler of ['typescript-5.9', 'typescript'] as const) {
    execFileSync(
      process.execPath,
      [
        join(repositoryRoot, 'node_modules', compiler, 'bin', 'tsc'),
        '-p',
        'tsconfig.json',
        '--pretty',
        'false',
      ],
      { cwd: consumerDirectory, stdio: 'inherit' },
    )
  }

  // Execute the same module only after both supported compilers accept it.
  execFileSync(process.execPath, ['runtime.mts'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  })
} finally {
  rmSync(consumerDirectory, { force: true, recursive: true })
}
