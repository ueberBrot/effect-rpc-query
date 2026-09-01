import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PageLayout, Panel } from '../components/page-layout.tsx'

const featuredUserInput = { id: 1 } as const

export const Route = createFileRoute('/details')({
  component: FeaturedUserPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      context.rpcQuery.users.get.queryOptions({ input: featuredUserInput }),
    )
  },
})

function FeaturedUserPage() {
  const { rpcQuery } = Route.useRouteContext()
  const featured = useSuspenseQuery(rpcQuery.users.get.queryOptions({ input: featuredUserInput }))

  return (
    <PageLayout
      description="The loader primes a generated user query. Typed navigation reads the same cached result."
      eyebrow="Generated query prefetch"
      title="Featured user"
    >
      <div className="mt-8">
        <Panel title={featured.data.name}>
          <p className="mt-2 text-sm text-slate-500">
            User {featured.data.id}, locale {featured.data.locale}
          </p>
        </Panel>
      </div>
    </PageLayout>
  )
}
