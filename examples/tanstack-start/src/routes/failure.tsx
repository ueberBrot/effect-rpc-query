import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { EffectErrorDetails } from '../components/effect-error-details.tsx'
import { PageLayout, Panel } from '../components/page-layout.tsx'

export const Route = createFileRoute('/failure')({
  component: FailurePage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(context.rpcQuery.diagnostics.fail.queryOptions()),
})

function FailurePage() {
  const { rpcQuery } = Route.useRouteContext()
  const failure = useQuery(rpcQuery.diagnostics.fail.queryOptions())

  return (
    <PageLayout
      description="Failed queries stay out of dehydrated state, so the browser refetches them through the generated options."
      eyebrow="Failed SSR query"
      title="Browser refetch"
    >
      <div className="mt-8">
        <Panel title="Declared query failure">
          {failure.isPending ? (
            <p className="mt-3 text-slate-600">Refetching in the browser…</p>
          ) : null}
          <EffectErrorDetails error={failure.error} />
        </Panel>
      </div>
    </PageLayout>
  )
}
