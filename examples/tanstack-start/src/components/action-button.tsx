import type { ButtonHTMLAttributes } from 'react'

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary'
}

const variants = {
  primary: 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
  secondary: 'border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50',
} as const

export const ActionButton = ({ className, variant = 'primary', ...props }: ActionButtonProps) => (
  <button
    className={[
      'rounded-lg border px-4 py-2 font-bold transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      variants[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
)
