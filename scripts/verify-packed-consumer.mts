// fallow-ignore-file unused-file
// Vite+ invokes this verifier through its dynamically declared packed-package task.
import { deepStrictEqual, equal, match } from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import repositoryManifest from '../package.json' with { type: 'json' }

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactDirectory = join(repositoryRoot, '.artifacts')
const consumerFixtureDirectory = join(repositoryRoot, 'tests', 'packed-consumer')
const tarballName = `${repositoryManifest.name.replace(/^@/, '').replaceAll('/', '-')}-${repositoryManifest.version}.tgz`
const tarballPath = join(artifactDirectory, tarballName)

if (!existsSync(tarballPath)) {
  throw new Error(`Packed tarball does not exist: ${tarballPath}`)
}

const packedManifest = JSON.parse(
  execFileSync('tar', ['-xOzf', tarballPath, 'package/package.json'], { encoding: 'utf8' }),
) as typeof repositoryManifest

const testedVersion = (dependency: keyof typeof repositoryManifest.devDependencies): string =>
  repositoryManifest.devDependencies[dependency]

deepStrictEqual(packedManifest.exports, {
  '.': {
    types: './dist/index.d.mts',
    import: './dist/index.mjs',
  },
})
deepStrictEqual(packedManifest.peerDependencies, {
  '@tanstack/query-core': '>=5.102.0 <6',
  effect: '4.0.0-rc.111',
})
equal(packedManifest.peerDependencies.effect, testedVersion('effect'))
equal('engines' in packedManifest, false)

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

const queryCorePeerRange = packedManifest.peerDependencies['@tanstack/query-core']
const queryCoreMinimum = /^>=(?<minimum>\d+\.\d+\.\d+) <6$/u.exec(queryCorePeerRange)?.groups?.[
  'minimum'
]
if (queryCoreMinimum === undefined) {
  throw new Error(`Unsupported Query Core peer range: ${queryCorePeerRange}`)
}

const testedQueryCoreVersion = testedVersion('@tanstack/query-core')
const testedReactQueryVersion = testedVersion('@tanstack/react-query')
equal(testedReactQueryVersion, testedQueryCoreVersion)
equal(
  testedQueryCoreVersion === queryCoreMinimum,
  false,
  'The tested current Query Core must be newer than the peer lower bound',
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

const verifyConsumer = (
  label: string,
  queryCoreVersion: string,
  reactQueryVersion: string,
): void => {
  const consumerDirectory = mkdtempSync(join(tmpdir(), `effect-rpc-query-${label}-`))

  try {
    cpSync(consumerFixtureDirectory, consumerDirectory, { recursive: true })

    const manifestTemplate = readFileSync(join(consumerDirectory, 'package.template.json'), 'utf8')
    const consumerManifest = manifestTemplate
      .replaceAll('__LABEL__', label)
      .replaceAll('__QUERY_CORE_VERSION__', queryCoreVersion)
      .replaceAll('__REACT_QUERY_VERSION__', reactQueryVersion)
      .replaceAll('__EFFECT_VERSION__', testedVersion('effect'))
      .replaceAll('__PACKAGE_TARBALL__', `file:${tarballPath}`)
      .replaceAll('__REACT_VERSION__', testedVersion('react'))
    writeFileSync(join(consumerDirectory, 'package.json'), consumerManifest)

    // Prefer cached artifacts, but allow a fresh machine to fetch exact pinned versions.
    // The temporary project must resolve every peer from its own node_modules.
    execFileSync('pnpm', ['install', '--ignore-scripts', '--prefer-offline'], {
      cwd: consumerDirectory,
      stdio: 'inherit',
    })

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

    execFileSync(process.execPath, ['runtime.mts'], {
      cwd: consumerDirectory,
      stdio: 'inherit',
    })
  } finally {
    rmSync(consumerDirectory, { force: true, recursive: true })
  }
}

verifyConsumer('lower-bound', queryCoreMinimum, queryCoreMinimum)
verifyConsumer('current', testedQueryCoreVersion, testedReactQueryVersion)
