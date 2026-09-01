import { QueryClientProvider } from '@tanstack/react-query'

import type { ViteReactApplication } from './application.ts'
import { DiagnosticsSection } from './diagnostics-section.tsx'
import { MutationsSection } from './mutations-section.tsx'
import { QueriesSection } from './queries-section.tsx'

const ExampleContent = ({ application }: { readonly application: ViteReactApplication }) => (
  <main>
    <header>
      <p className="eyebrow">Effect RPC with TanStack Query</p>
      <h1>Effect RPC in a plain React app</h1>
      <p>
        This app owns the RPC client, its lifetime, and the QueryClient. Each control passes
        generated options directly to React Query.
      </p>
    </header>

    <QueriesSection application={application} />
    <MutationsSection application={application} />
    <DiagnosticsSection application={application} />
  </main>
)

export const ViteReactExample = ({
  application,
}: {
  readonly application: ViteReactApplication
}) => (
  <QueryClientProvider client={application.queryClient}>
    <ExampleContent application={application} />
  </QueryClientProvider>
)
