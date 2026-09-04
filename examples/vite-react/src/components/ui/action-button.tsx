import type { ComponentProps } from 'react'

export interface ActionButtonProps extends ComponentProps<'button'> {
  readonly variant?: 'danger' | 'primary' | 'secondary'
}

const variants = {
  danger: 'border-red-800/80 bg-red-950/70 text-red-200 hover:bg-red-900/70',
  primary: 'border-violet-500 bg-violet-600 text-white hover:bg-violet-500',
  secondary: 'border-violet-800 bg-black text-violet-200 hover:bg-violet-950/70',
} as const

export const ActionButton = ({ className, variant = 'primary', ...props }: ActionButtonProps) => (
  <button
    className={[
      'rounded-sm border px-4 py-2.5 text-sm font-bold transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-45',
      variants[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
)
