// fallow-ignore-file unused-file
// Vite+ invokes this verifier through its dynamically declared packed-package task.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactDirectory = join(repositoryRoot, '.artifacts')
const packageManifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
  readonly name: string
  readonly version: string
}
const tarballName = `${packageManifest.name.replace(/^@/, '').replaceAll('/', '-')}-${packageManifest.version}.tgz`
const tarballPath = join(artifactDirectory, tarballName)

if (!existsSync(tarballPath)) {
  throw new Error(`Packed tarball does not exist: ${tarballPath}`)
}

const consumerDirectory = mkdtempSync(join(tmpdir(), 'effect-rpc-query-'))

try {
  writeFileSync(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'effect-rpc-query-packed-consumer',
        private: true,
        dependencies: {
          '@tanstack/query-core': '5.102.0',
          effect: '4.0.0-rc.111',
          'effect-rpc-query': `file:${tarballPath}`,
        },
      },
      null,
      2,
    ),
  )

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

  writeFileSync(
    join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          lib: ['ES2022', 'DOM', 'DOM.Iterable', 'ESNext.Disposable'],
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
          types: [],
        },
        include: ['runtime.mts'],
      },
      null,
      2,
    ),
  )

  execFileSync(
    process.execPath,
    [
      join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
      '-p',
      'tsconfig.json',
      '--pretty',
      'false',
    ],
    { cwd: consumerDirectory, stdio: 'inherit' },
  )

  // Execute the same module after the installed declarations pass the smoke check.
  execFileSync(process.execPath, ['runtime.mts'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  })
} finally {
  rmSync(consumerDirectory, { force: true, recursive: true })
}
