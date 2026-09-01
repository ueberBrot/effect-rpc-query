import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'

import type { ViteReactApplication } from '../../lib/application.ts'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'
import { UserList } from '../users/user-list.tsx'

const FeaturedUser = ({ application }: { readonly application: ViteReactApplication }) => {
  const featured = useSuspenseQuery(
    application.rpcQuery.users.get.queryOptions({ input: { id: 1 } }),
  )
  return <p className="text-sm text-slate-600">Featured: {featured.data.name}</p>
}

export const QueriesSection = ({ application }: { readonly application: ViteReactApplication }) => {
  const { queryClient, rpcQuery } = application
  const users = useQuery(rpcQuery.users.list.queryOptions())
  const [cacheMessage, setCacheMessage] = useState<string>()
  const [invalidationMessage, setInvalidationMessage] = useState<string>()
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: rpcQuery.users.key() })

  const reuseCachedUsers = async () => {
    const cached = await queryClient.query({
      ...rpcQuery.users.list.queryOptions(),
      staleTime: Infinity,
    })
    setCacheMessage(`Cached users: ${String(cached?.length ?? 0)}`)
  }

  const invalidateUserQueries = async () => {
    await invalidateUsers()
    setInvalidationMessage('User queries invalidated')
  }

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-950/5">
      <h2 className="text-xl font-bold text-slate-950">Queries and cache keys</h2>
      {users.isPending ? <p className="text-sm text-slate-600">Loading users…</p> : null}
      {users.error === null ? null : <EffectErrorDetails error={users.error} />}
      <UserList application={application} users={users.data} />
      <Suspense fallback={<p className="text-sm text-slate-600">Loading featured user…</p>}>
        <FeaturedUser application={application} />
      </Suspense>
      <div className="flex flex-wrap gap-3">
        <ActionButton onClick={() => void reuseCachedUsers()} type="button">
          Read cached users
        </ActionButton>
        <ActionButton onClick={() => void invalidateUserQueries()} type="button">
          Invalidate user queries
        </ActionButton>
      </div>
      {cacheMessage === undefined ? null : <p className="text-sm">{cacheMessage}</p>}
      {invalidationMessage === undefined ? null : <p className="text-sm">{invalidationMessage}</p>}
    </section>
  )
}
