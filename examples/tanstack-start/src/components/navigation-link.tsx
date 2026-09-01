import { createLink } from '@tanstack/react-router'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

const NavigationAnchor = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'>>(
  ({ className, ...props }, ref) => (
    <a
      className={[
        'inline-block rounded-full px-3 py-2 font-bold no-underline transition-colors',
        'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      ref={ref}
      {...props}
    />
  ),
)

NavigationAnchor.displayName = 'NavigationAnchor'

/** A design-system anchor with TanStack Router's typed navigation interface. */
export const NavigationLink = createLink(NavigationAnchor)
