import { defineConfig } from 'vite-plus'

const ignoredPaths = [
  '.agents/**',
  '.artifacts/**',
  '.fallow/**',
  '.vite/**',
  'coverage/**',
  'dist/**',
  'examples/tanstack-start/src/routeTree.gen.ts',
  'node_modules/**',
  'playwright-report/**',
  'test-results/**',
]

// Packed fixtures resolve only the installed tarball from isolated temporary projects.
const packedFixtures = ['tests/packed-consumer/**', 'tests/types/**']

export default defineConfig({
  fmt: {
    ignorePatterns: ignoredPaths,
    overrides: [
      {
        files: ['*.jsonc', '**/*.jsonc'],
        options: {
          trailingComma: 'none',
        },
      },
    ],
    semi: false,
    singleQuote: true,
    sortImports: {
      customGroups: [
        {
          groupName: 'effect-rpc-query',
          elementNamePattern: ['#effect-rpc-query', '#effect-rpc-query/**'],
        },
      ],
      groups: [
        ['builtin', 'external'],
        'effect-rpc-query',
        ['parent', 'sibling', 'index'],
        ['side_effect_style', 'style'],
        'unknown',
      ],
      newlinesBetween: true,
    },
    sortTailwindcss: {
      stylesheet: './examples/vite-react/src/styles/tailwind.css',
    },
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: [...ignoredPaths, ...packedFixtures],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  check: {
    fmt: true,
    lint: true,
  },
  test: {
    fileParallelism: true,
    include: ['examples/**/*.test.ts', 'examples/**/*.test.tsx', 'tests/**/*.test.ts'],
    passWithNoTests: true,
  },
  pack: {
    attw: {
      level: 'error',
      profile: 'esm-only',
    },
    clean: true,
    deps: {
      neverBundle: ['effect', '@tanstack/query-core'],
    },
    dts: true,
    entry: ['src/index.ts'],
    format: ['esm'],
    publint: {
      level: 'error',
      strict: true,
    },
    sourcemap: true,
    target: 'es2022',
    unused: {
      ignore: {
        dependencies: ['effect'],
      },
      level: 'error',
    },
  },
  run: {
    tasks: {
      check: {
        command: 'vp check',
        dependsOn: ['pack'],
        output: [],
      },
      format: {
        command: 'vp fmt --check',
        output: [],
      },
      lint: {
        command: 'vp lint',
        dependsOn: ['pack'],
        output: [],
      },
      typecheck: {
        command: 'vp check --no-fmt --no-lint',
        dependsOn: ['pack'],
        output: [],
      },
      'effect-check': {
        command: 'effect-tsgo diagnostics --project tsconfig.json --strict',
        dependsOn: ['pack'],
        output: [],
      },
      pack: {
        command: 'vp pack',
        input: [{ auto: true }, '!dist/**'],
        output: ['dist/**'],
      },
      'packed-package': {
        command: [
          'pnpm --config.ignore-scripts=true pack --pack-destination .artifacts',
          'fallow dead-code --private-type-leaks --file dist/index.d.mts',
          'node scripts/verify-packed-consumer.mts',
        ],
        dependsOn: ['pack'],
        output: ['.artifacts/*.tgz'],
      },
      fallow: {
        command: [
          // Public barrel exports must be exercised by repository evidence.
          'fallow dead-code --include-entry-exports',
          // Test-only reachability must not hide dead shipped internals.
          'fallow dead-code --production',
          'fallow dupes',
          'fallow health --hotspots --file-scores --min-score 75',
        ],
        cache: false,
      },
      test: {
        command: 'vp test',
        dependsOn: ['pack'],
        output: [],
      },
      e2e: {
        command: 'playwright test',
        cache: false,
      },
      'e2e:chromium': {
        command: 'playwright test --project=chromium',
        cache: false,
      },
      'e2e:firefox': {
        command: 'playwright test --project=firefox',
        cache: false,
      },
      'e2e:webkit': {
        command: 'playwright test --project=webkit',
        cache: false,
      },
      quality: {
        command: ['vp run check', 'vp run effect-check', 'vp run fallow', 'vp run test'],
      },
      server: {
        command: 'tsx examples/server/src/main.ts',
        cache: false,
      },
      'vite-react': {
        command: 'pnpm --filter @effect-rpc-query/vite-react dev',
        cache: false,
        dependsOn: ['pack'],
      },
      'vite-react-dev': {
        command:
          'vp run --parallel --log labeled --filter @effect-rpc-query/server --filter @effect-rpc-query/vite-react dev',
        cache: false,
        dependsOn: ['pack'],
      },
      'vite-react-build': {
        command: 'pnpm --filter @effect-rpc-query/vite-react build',
        dependsOn: ['pack'],
        input: [{ auto: true }, '!examples/vite-react/dist/**'],
        output: ['examples/vite-react/dist/**'],
      },
      'vite-react-preview': {
        command: 'vp -C examples/vite-react preview',
        cache: false,
        dependsOn: ['vite-react-build'],
      },
      'tanstack-start': {
        command: 'pnpm --filter @effect-rpc-query/tanstack-start dev',
        cache: false,
        dependsOn: ['pack'],
      },
      'tanstack-start-dev': {
        command:
          'vp run --parallel --log labeled --filter @effect-rpc-query/server --filter @effect-rpc-query/tanstack-start dev',
        cache: false,
        dependsOn: ['pack'],
      },
      'tanstack-start-build': {
        command: 'pnpm --filter @effect-rpc-query/tanstack-start build',
        dependsOn: ['pack'],
        input: [{ auto: true }, '!examples/tanstack-start/dist/**'],
        output: ['examples/tanstack-start/dist/**'],
      },
      'tanstack-start-preview': {
        command: 'vp -C examples/tanstack-start preview',
        cache: false,
        dependsOn: ['tanstack-start-build'],
      },
      validate: {
        command: [
          'vp run quality',
          'vp run packed-package',
          'vp run vite-react-build',
          'vp run tanstack-start-build',
          'vp run e2e:chromium',
        ],
      },
    },
  },
  staged: {
    '*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}': 'vp check --fix',
    '*.{json,jsonc,md,yaml,yml}': 'vp fmt',
  },
})
