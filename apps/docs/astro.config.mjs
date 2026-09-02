// @ts-check

import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'
import starlightThemeBlack from 'starlight-theme-black'

import packageManifest from '../../package.json' with { type: 'json' }

const repositoryUrl = 'https://github.com/ueberBrot/effect-rpc-query'

export default defineConfig({
  base: '/effect-rpc-query',
  integrations: [
    starlight({
      description: 'Type-safe TanStack Query utilities generated from Effect RPC definitions.',
      editLink: {
        baseUrl: `${repositoryUrl}/edit/main/apps/docs/`,
      },
      lastUpdated: true,
      logo: {
        src: './src/assets/icon.svg',
      },
      plugins: [
        starlightThemeBlack({
          navLinks: [
            {
              label: `v${packageManifest.version}`,
              link: `${repositoryUrl}/blob/main/package.json`,
            },
          ],
        }),
        starlightLinksValidator({
          errorOnRelativeLinks: true,
        }),
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Installation', slug: 'getting-started/installation' },
            {
              label: 'Compatibility and Stability',
              slug: 'getting-started/compatibility-and-stability',
            },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'React Query', slug: 'guides/react-query' },
            { label: 'TanStack Start', slug: 'guides/tanstack-start' },
            { label: 'Cache Management', slug: 'guides/cache-management' },
            { label: 'Cancellation', slug: 'guides/cancellation' },
            { label: 'Handle Failures', slug: 'guides/handle-failures' },
            { label: 'Custom Key Encoders', slug: 'guides/custom-key-encoders' },
            { label: 'Conditional Queries', slug: 'guides/conditional-queries' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'RPC Utility Tree', slug: 'concepts/rpc-utility-tree' },
            { label: 'Queries and Mutations', slug: 'concepts/queries-and-mutations' },
            { label: 'Client Lifecycle', slug: 'concepts/client-lifecycle' },
            { label: 'Semantic Keys', slug: 'concepts/semantic-keys' },
            { label: 'Data Normalization', slug: 'concepts/data-normalization' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Factory', slug: 'reference/factory' },
            { label: 'Generated Builders', slug: 'reference/generated-builders' },
            { label: 'Errors', slug: 'reference/errors' },
            { label: 'Public Exports', slug: 'reference/public-exports' },
            { label: 'Compatibility and Limits', slug: 'reference/compatibility-and-limits' },
          ],
        },
        {
          label: 'Examples and Contributing',
          items: [
            { label: 'Executable Examples', slug: 'examples' },
            { label: 'Dev Container', slug: 'contributing/dev-container' },
          ],
        },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: repositoryUrl }],
      title: 'effect-rpc-query',
    }),
  ],
  site: 'https://ueberbrot.github.io',
})
