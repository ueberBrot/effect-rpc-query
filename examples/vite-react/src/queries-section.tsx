import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'

import type { ViteReactApplication } from './application.ts'
import { EffectErrorDetails } from './effect-error-details.tsx'

const FeaturedUser = ({ application }: { readonly application: ViteReactApplication }) => {
  const featured = useSuspenseQuery(application.rpc.users.get.queryOptions({ input: { id: 1 } }))
  return <p>Featured: {featured.data.name}</p>
}

export const QueriesSection = ({ application }: { readonly application: ViteReactApplication }) => {
  const { queryClient, rpc } = application
  const users = useQuery(rpc.users.list.queryOptions())
  const [cacheMessage, setCacheMessage] = useState<string>()
  const [invalidationMessage, setInvalidationMessage] = useState<string>()

  const reuseCachedUsers = async () => {
    const cached = await queryClient.fetchQuery({
      ...rpc.users.list.queryOptions(),
      staleTime: Infinity,
    })
    setCacheMessage(`Reused ${String(cached?.length ?? 0)} cached users`)
  }

  const invalidateUserQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: rpc.users.key() })
    setInvalidationMessage('User cache invalidated')
  }

  return (
    <section>
      <h2>Queries and caching</h2>
      {users.isPending ? <p>Loading users...</p> : null}
      {users.error === null ? null : <EffectErrorDetails error={users.error} />}
      <ul>
        {users.data?.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <Suspense fallback={<p>Loading featured user...</p>}>
        <FeaturedUser application={application} />
      </Suspense>
      <div className="actions">
        <button onClick={() => void reuseCachedUsers()} type="button">
          Reuse cached list
        </button>
        <button onClick={() => void invalidateUserQueries()} type="button">
          Invalidate user cache
        </button>
      </div>
      {cacheMessage === undefined ? null : <p>{cacheMessage}</p>}
      {invalidationMessage === undefined ? null : <p>{invalidationMessage}</p>}
    </section>
  )
}
