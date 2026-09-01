import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'

import type { ViteReactApplication } from '../../lib/application.ts'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'
import { UserList } from '../users/user-list.tsx'

const FeaturedUser = ({ application }: { readonly application: ViteReactApplication }) => {
  const featured = useSuspenseQuery(application.rpc.users.get.queryOptions({ input: { id: 1 } }))
  return <p className="text-sm text-slate-600">Featured: {featured.data.name}</p>
}

export const QueriesSection = ({ application }: { readonly application: ViteReactApplication }) => {
  const { queryClient, rpc } = application
  const users = useQuery(rpc.users.list.queryOptions())
  const [cacheMessage, setCacheMessage] = useState<string>()
  const [invalidationMessage, setInvalidationMessage] = useState<string>()
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: rpc.users.key() })

  const reuseCachedUsers = async () => {
    const cached = await queryClient.fetchQuery({
      ...rpc.users.list.queryOptions(),
      staleTime: Infinity,
    })
    setCacheMessage(`Reused ${String(cached?.length ?? 0)} cached users`)
  }

  const invalidateUserQueries = async () => {
    await invalidateUsers()
    setInvalidationMessage('User cache invalidated')
  }

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-950/5">
      <h2 className="text-xl font-bold text-slate-950">Queries and caching</h2>
      {users.isPending ? <p className="text-sm text-slate-600">Loading users...</p> : null}
      {users.error === null ? null : <EffectErrorDetails error={users.error} />}
      <UserList application={application} users={users.data} />
      <Suspense fallback={<p className="text-sm text-slate-600">Loading featured user...</p>}>
        <FeaturedUser application={application} />
      </Suspense>
      <div className="flex flex-wrap gap-3">
        <ActionButton onClick={() => void reuseCachedUsers()} type="button">
          Reuse cached list
        </ActionButton>
        <ActionButton onClick={() => void invalidateUserQueries()} type="button">
          Invalidate user cache
        </ActionButton>
      </div>
      {cacheMessage === undefined ? null : <p className="text-sm">{cacheMessage}</p>}
      {invalidationMessage === undefined ? null : <p className="text-sm">{invalidationMessage}</p>}
    </section>
  )
}
