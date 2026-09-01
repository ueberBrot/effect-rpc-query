import { QueryClientProvider } from '@tanstack/react-query'

import { DiagnosticsSection } from './components/sections/diagnostics-section.tsx'
import { MutationsSection } from './components/sections/mutations-section.tsx'
import { QueriesSection } from './components/sections/queries-section.tsx'
import type { ViteReactApplication } from './lib/application.ts'

const ExampleContent = ({ application }: { readonly application: ViteReactApplication }) => (
  <div className="min-h-screen bg-emerald-50 text-slate-900 antialiased">
    <main className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-2">
      <header className="rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-950/5 md:col-span-2">
        <p className="mb-2 text-xs font-bold tracking-widest text-emerald-700 uppercase">
          Vite client example
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Generated Effect RPC options in React
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Use generated query options, mutation options, and key helpers with TanStack Query. The
          controls show caching, invalidation, Effect failures, cancellation, and cleanup.
        </p>
      </header>

      <QueriesSection application={application} />
      <MutationsSection application={application} />
      <DiagnosticsSection application={application} />
    </main>
  </div>
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
