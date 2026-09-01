import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { NavigationLink } from '../components/navigation-link.tsx'
import type { TanStackStartApplication } from '../lib/application.ts'

import stylesheet from '../styles.css?url'

export const Route = createRootRouteWithContext<TanStackStartApplication>()({
  component: Root,
  head: () => ({
    links: [{ href: stylesheet, rel: 'stylesheet' }],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { title: 'Effect RPC Query with TanStack Start' },
    ],
  }),
})

function Root() {
  return (
    <Document>
      <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-emerald-50/60 text-slate-800">
        <header className="border-b border-emerald-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <NavigationLink
              className="px-0 font-black tracking-tight text-emerald-950 hover:bg-transparent"
              to="/"
            >
              effect-rpc-query
            </NavigationLink>
            <nav aria-label="Primary">
              <ul className="flex flex-wrap gap-1 p-0 text-sm font-bold text-slate-600">
                <li className="list-none">
                  <NavigationLink
                    activeProps={{ className: 'bg-emerald-100 text-emerald-800' }}
                    to="/"
                  >
                    Users
                  </NavigationLink>
                </li>
                <li className="list-none">
                  <NavigationLink
                    activeProps={{ className: 'bg-emerald-100 text-emerald-800' }}
                    to="/details"
                  >
                    Featured user
                  </NavigationLink>
                </li>
                <li className="list-none">
                  <NavigationLink
                    activeProps={{ className: 'bg-emerald-100 text-emerald-800' }}
                    to="/diagnostics"
                  >
                    Diagnostics
                  </NavigationLink>
                </li>
                <li className="list-none">
                  <NavigationLink
                    activeProps={{ className: 'bg-emerald-100 text-emerald-800' }}
                    to="/failure"
                  >
                    SSR failure
                  </NavigationLink>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <Outlet />
        <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-slate-500 sm:px-6">
          Generated Effect RPC options with the TanStack Query lifecycle.
        </footer>
      </div>
    </Document>
  )
}

function Document({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="m-0 min-h-screen min-w-80 antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
