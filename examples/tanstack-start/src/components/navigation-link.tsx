import { createLink } from '@tanstack/react-router'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

const NavigationAnchor = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'>>(
  ({ className, ...props }, ref) => (
    <a
      className={[
        'inline-block border border-transparent px-3 py-2 text-sm font-bold no-underline transition-colors',
        'text-zinc-400 hover:border-violet-900 hover:bg-violet-950/30 hover:text-violet-200',
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
