import type { ReactNode } from 'react'

export const PageLayout = ({
  children,
  description,
  eyebrow,
  title,
}: {
  readonly children: ReactNode
  readonly description: ReactNode
  readonly eyebrow: string
  readonly title: string
}) => (
  <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
    <p className="mb-2 text-xs font-extrabold tracking-[0.14em] text-emerald-700 uppercase">
      {eyebrow}
    </p>
    <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
      {title}
    </h1>
    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
    {children}
  </main>
)

export const Panel = ({
  children,
  title,
}: {
  readonly children: ReactNode
  readonly title: string
}) => (
  <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-950/5">
    <h2 className="text-xl font-black text-slate-950">{title}</h2>
    {children}
  </section>
)
