import { useInfiniteQuery, useQuery, useSuspenseQuery } from '@tanstack/react-query'
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
  const diagnostics = useQuery(rpcQuery.diagnostics.stream.streamedOptions())
  const liveDiagnostic = useQuery(rpcQuery.diagnostics.stream.liveOptions())
  const userPages = useInfiniteQuery(
    rpcQuery.users.page.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: 0,
      input: (cursor: number) => ({ cursor, pageSize: 1 }),
    }),
  )
  const infiniteUsers = userPages.data?.pages.flatMap((page) => page.users) ?? []
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
      <p className="text-sm text-slate-600">
        Infinite users: {infiniteUsers.map((user) => user.name).join(', ')}
      </p>
      <p className="text-sm text-slate-600">
        Accumulated diagnostics: {diagnostics.data?.join(', ') ?? 'Waiting for values…'}
      </p>
      <p className="text-sm text-slate-600">
        Live diagnostic: {liveDiagnostic.data ?? 'Waiting for a value…'}
      </p>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          disabled={!userPages.hasNextPage || userPages.isFetchingNextPage}
          onClick={() => void userPages.fetchNextPage()}
          type="button"
        >
          Load next user page
        </ActionButton>
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
