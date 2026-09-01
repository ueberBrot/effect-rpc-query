import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { ActionButton } from '../components/action-button.tsx'
import { PageLayout, Panel } from '../components/page-layout.tsx'

export const Route = createFileRoute('/')({
  component: UsersPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.rpcQuery.users.list.queryOptions())
  },
})

function UsersPage() {
  const { queryClient, rpcQuery } = Route.useRouteContext()
  const users = useSuspenseQuery(rpcQuery.users.list.queryOptions())
  const [message, setMessage] = useState<string>()
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: rpcQuery.users.key() })
  const seedUsers = useMutation(
    rpcQuery.testing.seed.mutationOptions({
      onSuccess: invalidateUsers,
    }),
  )
  const resetUsers = useMutation(
    rpcQuery.testing.reset.mutationOptions({ onSuccess: invalidateUsers }),
  )
  const reuseCachedUsers = async () => {
    const cached = await queryClient.query({
      ...rpcQuery.users.list.queryOptions(),
      staleTime: Infinity,
    })
    setMessage(`Cached users: ${String(cached.length)}`)
  }

  return (
    <PageLayout
      description="The route loader primes a generated users query. After SSR hydration, the suspense hook reads the same cache entry without another request."
      eyebrow="TanStack Start example"
      title="Hydrate generated RPC queries"
    >
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Panel title="Users">
          <ul className="mt-4 grid gap-3 p-0">
            {users.data.map((user) => (
              <li className="grid list-none gap-1 rounded-xl bg-emerald-50 p-4" key={user.id}>
                <strong>{user.name}</strong>
                <span className="text-sm text-slate-500">
                  User {user.id}, locale {user.locale}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Cache behavior">
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Generated key helpers target the users cache after each mutation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton
              onClick={() =>
                seedUsers.mutate({
                  users: [{ name: 'Grace Hopper' }, { name: 'Margaret Hamilton' }],
                })
              }
              type="button"
            >
              Seed users
            </ActionButton>
            <ActionButton onClick={() => resetUsers.mutate(undefined)} variant="secondary">
              Reset users
            </ActionButton>
            <ActionButton onClick={() => void reuseCachedUsers()} variant="secondary">
              Read cached users
            </ActionButton>
          </div>
          {message === undefined ? null : <p className="mt-4 text-sm">{message}</p>}
        </Panel>
      </div>
    </PageLayout>
  )
}
