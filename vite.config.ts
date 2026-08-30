import { defineConfig } from 'vite-plus'

const ignoredPaths = [
  '.agents/**',
  '.artifacts/**',
  '.fallow/**',
  '.vite/**',
  'coverage/**',
  'dist/**',
  'node_modules/**',
  'playwright-report/**',
  'test-results/**',
]

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
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: ignoredPaths,
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
    include: ['tests/**/*.test.ts'],
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
        output: [],
      },
      'effect-check': {
        command: 'effect-tsgo diagnostics --project tsconfig.json --strict',
        output: [],
      },
      pack: {
        command: 'vp pack',
        input: [{ auto: true }, '!dist/**'],
        output: ['dist/**'],
      },
      'packed-package': {
        command: 'pnpm --config.ignore-scripts=true pack --pack-destination .artifacts',
        dependsOn: ['packed-types'],
        output: ['.artifacts/*.tgz'],
      },
      'packed-types': {
        command: [
          'node node_modules/typescript-5.9/bin/tsc -p tests/types/tsconfig.json',
          'node node_modules/typescript/bin/tsc -p tests/types/tsconfig.json',
        ],
        dependsOn: ['pack'],
        output: [],
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
        output: [],
      },
      e2e: {
        command: 'playwright test',
        cache: false,
      },
      validate: {
        command: [
          'vp run check',
          'vp run effect-check',
          'vp run fallow',
          'vp run test',
          'vp run packed-package',
        ],
      },
    },
  },
  staged: {
    '*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}': 'vp check --fix',
    '*.{json,jsonc,md,yaml,yml}': 'vp fmt',
  },
})
