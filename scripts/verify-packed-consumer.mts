// fallow-ignore-file unused-file
// Vite+ invokes this verifier through its dynamically declared packed-package task.
import { deepStrictEqual, equal, match } from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactDirectory = join(repositoryRoot, '.artifacts')

interface PackageManifest {
  readonly author?: string
  readonly description?: string
  readonly devDependencies?: Readonly<Record<string, string>>
  readonly engines?: unknown
  readonly exports?: unknown
  readonly files?: unknown
  readonly license?: string
  readonly main?: string
  readonly module?: string
  readonly name: string
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly publishConfig?: unknown
  readonly repository?: unknown
  readonly sideEffects?: boolean
  readonly type?: string
  readonly types?: string
  readonly version: string
}

const repositoryManifest = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
) as PackageManifest
const tarballName = `${repositoryManifest.name.replace(/^@/, '').replaceAll('/', '-')}-${repositoryManifest.version}.tgz`
const tarballPath = join(artifactDirectory, tarballName)

if (!existsSync(tarballPath)) {
  throw new Error(`Packed tarball does not exist: ${tarballPath}`)
}

const packageManifest = JSON.parse(
  execFileSync('tar', ['-xOzf', tarballPath, 'package/package.json'], { encoding: 'utf8' }),
) as PackageManifest

const testedVersion = (dependency: string): string => {
  const version = repositoryManifest.devDependencies?.[dependency]
  if (version === undefined) {
    throw new Error(`Missing tested dependency pin: ${dependency}`)
  }
  return version
}

equal(packageManifest.name, repositoryManifest.name)
equal(packageManifest.version, repositoryManifest.version)

equal(
  packageManifest.description,
  'Type-safe TanStack Query utilities generated from Effect RPC definitions.',
)
equal(packageManifest.author, 'Maurice de Bruyn')
equal(packageManifest.license, 'ISC')
deepStrictEqual(packageManifest.repository, {
  type: 'git',
  url: 'git+https://github.com/ueberBrot/effect-rpc-query.git',
})
deepStrictEqual(packageManifest.publishConfig, { access: 'public' })
deepStrictEqual(packageManifest.files, ['dist'])
equal(packageManifest.type, 'module')
equal(packageManifest.sideEffects, false)
equal(packageManifest.main, './dist/index.mjs')
equal(packageManifest.module, './dist/index.mjs')
equal(packageManifest.types, './dist/index.d.mts')
deepStrictEqual(packageManifest.exports, {
  '.': {
    types: './dist/index.d.mts',
    import: './dist/index.mjs',
  },
})
deepStrictEqual(packageManifest.peerDependencies, {
  '@tanstack/query-core': '>=5.102.0 <6',
  effect: '4.0.0-rc.111',
})
equal(packageManifest.peerDependencies?.['effect'], testedVersion('effect'))
equal('engines' in packageManifest, false)

const publicBarrel = readFileSync(join(repositoryRoot, 'src', 'index.ts'), 'utf8')
equal(
  /\bexport\s+(?:type\s+)?\*/u.test(publicBarrel),
  false,
  'The public barrel must use named exports',
)

const builtModule = execFileSync('tar', ['-xOzf', tarballPath, 'package/dist/index.mjs'], {
  encoding: 'utf8',
})
match(builtModule, /from ["']@tanstack\/query-core["']/u)
match(builtModule, /from ["']effect(?:\/unstable\/rpc)?["']/u)
equal(/\bnode:/u.test(builtModule), false, 'The runtime must not import Node APIs')

const builtDeclaration = execFileSync('tar', ['-xOzf', tarballPath, 'package/dist/index.d.mts'], {
  encoding: 'utf8',
})
const declarationExport = /export \{ (?<names>[^}]+) \};/u.exec(builtDeclaration)?.groups?.['names']
if (declarationExport === undefined) {
  throw new Error('The declaration entry has no root export statement')
}
const declarationNames = declarationExport
  .split(',')
  .map((name) => name.trim().replace(/^type /u, ''))
  .sort()
deepStrictEqual(declarationNames, [
  'CreateRpcQueryUtilsOptions',
  'EffectRpcQueryConfigError',
  'EffectRpcQueryConfigErrorCode',
  'EffectRpcQueryError',
  'EffectRpcQueryKeyError',
  'EffectRpcQueryKeyErrorCode',
  'JsonValue',
  'KeyEncoder',
  'QueryData',
  'RpcQueryUtils',
  'RunPromiseExit',
  'SkipToken',
  'createRpcQueryUtils',
  'isEffectRpcQueryError',
  'skipToken',
])

const testedQueryCoreVersion = testedVersion('@tanstack/query-core')
const [queryMajor = Number.NaN, queryMinor = Number.NaN] = testedQueryCoreVersion
  .split('.')
  .map(Number)
equal(
  queryMajor === 5 && queryMinor >= 102,
  true,
  `Tested Query Core ${testedQueryCoreVersion} is outside the declared peer range`,
)

const packedFiles = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .sort()
deepStrictEqual(packedFiles, [
  'package/LICENSE',
  'package/README.md',
  'package/dist/index.d.mts',
  'package/dist/index.mjs',
  'package/dist/index.mjs.map',
  'package/package.json',
])

const consumerDirectory = mkdtempSync(join(tmpdir(), 'effect-rpc-query-'))

try {
  writeFileSync(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'effect-rpc-query-packed-consumer',
        private: true,
        dependencies: {
          '@tanstack/query-core': testedVersion('@tanstack/query-core'),
          '@tanstack/react-query': testedVersion('@tanstack/react-query'),
          effect: testedVersion('effect'),
          'effect-rpc-query': `file:${tarballPath}`,
          react: testedVersion('react'),
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
import { skipToken as reactQuerySkipToken } from '@tanstack/react-query'
import type {
  CreateRpcQueryUtilsOptions,
  EffectRpcQueryConfigErrorCode,
  EffectRpcQueryKeyErrorCode,
  JsonValue,
  KeyEncoder,
  QueryData,
  RpcQueryUtils,
  RunPromiseExit,
  SkipToken,
} from 'effect-rpc-query'

type PublicTypes = [
  CreateRpcQueryUtilsOptions<any, readonly [JsonValue, ...JsonValue[]]>,
  EffectRpcQueryConfigErrorCode,
  EffectRpcQueryKeyErrorCode,
  KeyEncoder<any>,
  QueryData<unknown>,
  RpcQueryUtils<any, readonly [JsonValue, ...JsonValue[]]>,
  RunPromiseExit,
  SkipToken,
]

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
if (rpcQuery.skipToken !== skipToken || rpcQuery.skipToken !== reactQuerySkipToken) {
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
