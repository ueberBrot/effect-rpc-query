import type { ComponentProps } from 'react'

export const ActionButton = (props: ComponentProps<'button'>) => (
  <button
    {...props}
    className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
  />
)
