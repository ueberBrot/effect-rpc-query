import type { ErrorComponentProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const StatusPage = ({
  children,
  title,
}: {
  readonly children: ReactNode
  readonly title: string
}) => (
  <main className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
    <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-950/5">
      <p className="mb-2 text-xs font-extrabold tracking-[0.14em] text-emerald-700 uppercase">
        TanStack Start
      </p>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
      {children}
    </section>
  </main>
)

export const PendingPage = () => (
  <StatusPage title="Loading route">
    <p className="text-slate-600">Fetching RPC data…</p>
  </StatusPage>
)

export const NotFoundPage = () => (
  <StatusPage title="Page not found">
    <p className="text-slate-600">No route matches this URL.</p>
  </StatusPage>
)

export const ErrorPage = ({ error, reset }: ErrorComponentProps) => (
  <StatusPage title="Route failed">
    <p className="rounded-lg border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-900">
      {error.message}
    </p>
    <button
      className="rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
      onClick={reset}
      type="button"
    >
      Try again
    </button>
  </StatusPage>
)
