import { useInfiniteQuery, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'

import type { ViteReactApplication } from '../../lib/application.ts'
import { ConditionalUserQuery } from '../conditional-user-query.tsx'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'
import { UserList } from '../users/user-list.tsx'

const PAGE_SIZE = 4

const streamedDiagnosticsOptions = (rpcQuery: ViteReactApplication['rpcQuery'], bounded: boolean) =>
  rpcQuery.diagnostics.stream.streamedOptions(bounded ? { maxChunks: 2 } : {})

const FeaturedUser = ({ application }: { readonly application: ViteReactApplication }) => {
  const featured = useSuspenseQuery(
    application.rpcQuery.users.get.queryOptions({ input: { id: 1 } }),
  )
  return <p className="text-sm text-zinc-400">Featured: {featured.data.name}</p>
}

export const QueriesSection = ({ application }: { readonly application: ViteReactApplication }) => {
  const { queryClient, rpcQuery } = application
  const users = useQuery(rpcQuery.users.list.queryOptions())
  const [boundedHistory, setBoundedHistory] = useState(false)
  const diagnostics = useQuery(streamedDiagnosticsOptions(rpcQuery, boundedHistory))
  const replayStream = (bounded: boolean) => {
    setBoundedHistory(bounded)
    void queryClient.query(streamedDiagnosticsOptions(rpcQuery, bounded)).catch(() => undefined)
  }
  const liveDiagnostic = useQuery(rpcQuery.diagnostics.stream.liveOptions())
  const userPages = useInfiniteQuery(
    rpcQuery.users.page.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: 0,
      input: (cursor: number) => ({ cursor, pageSize: PAGE_SIZE }),
    }),
  )
  const loadedUsers = userPages.data?.pages.flatMap((page) => page.users) ?? []
  const totalUsers = userPages.data?.pages[0]?.total ?? 0
  const pageCount = userPages.data?.pages.length ?? 0
  const remainingUsers = Math.max(0, totalUsers - loadedUsers.length)
  const nextPageSize = Math.min(PAGE_SIZE, remainingUsers)
  const [cacheMessage, setCacheMessage] = useState<string>()
  const [invalidationMessage, setInvalidationMessage] = useState<string>()
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: rpcQuery.users.key() })

  const reuseCachedUsers = async () => {
    const cached = await queryClient.query({
      ...rpcQuery.users.list.queryOptions(),
      staleTime: Infinity,
    })
    setCacheMessage(`Cached directory: ${String(cached?.length ?? 0)} users`)
  }

  const invalidateUserQueries = async () => {
    await invalidateUsers()
    setInvalidationMessage('Directory queries invalidated and refetched')
  }

  return (
    <section className="space-y-6 border border-zinc-800 bg-[#111113] p-6 shadow-2xl shadow-black/40 md:col-span-2">
      <div>
        <h2 className="display-heading text-3xl font-bold tracking-tight text-zinc-50">
          One directory, two strategies
        </h2>
        <p className="mt-2 max-w-3xl leading-7 text-zinc-400">
          The ordinary query downloads the full directory. The infinite query starts with four
          people and appends one clearly labeled page per click.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="display-heading text-xl font-bold text-zinc-100">Ordinary query</h3>
            <span className="border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm font-bold text-zinc-300">
              {String(users.data?.length ?? 0)} users in one response
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Every user arrives together and shares one cache entry.
          </p>
          {users.isPending ? <p className="mt-4 text-sm text-zinc-400">Loading users…</p> : null}
          {users.error === null ? null : <EffectErrorDetails error={users.error} />}
          <div className="mt-4">
            <UserList application={application} users={users.data} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Suspense fallback={<p className="text-sm text-zinc-400">Loading featured user…</p>}>
              <FeaturedUser application={application} />
            </Suspense>
            <ActionButton onClick={() => void reuseCachedUsers()} type="button" variant="secondary">
              Read cached directory
            </ActionButton>
            <ActionButton
              onClick={() => void invalidateUserQueries()}
              type="button"
              variant="secondary"
            >
              Invalidate user queries
            </ActionButton>
          </div>
          {cacheMessage === undefined ? null : <p className="mt-3 text-sm">{cacheMessage}</p>}
          {invalidationMessage === undefined ? null : (
            <p className="mt-3 text-sm">{invalidationMessage}</p>
          )}
        </div>

        <ConditionalUserQuery rpcQuery={rpcQuery} users={users.data ?? []} />

        <div className="border border-l-2 border-zinc-800 border-l-violet-600 bg-violet-950/10 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="display-heading text-xl font-bold text-zinc-100">Infinite query</h3>
            <span className="border border-violet-800 bg-violet-950/80 px-3 py-1 text-sm font-bold text-violet-200">
              {String(loadedUsers.length)} of {String(totalUsers)} loaded
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Each bordered block below is one RPC response. Loading more preserves every earlier page
            and appends the next one.
          </p>
          <ol className="mt-4 grid gap-3 p-0">
            {userPages.data?.pages.map((page, pageIndex) => (
              <li
                className="list-none border border-zinc-800 bg-black p-4"
                key={userPages.data.pageParams[pageIndex]}
              >
                <p className="display-heading text-sm font-bold text-violet-300">
                  Page {String(pageIndex + 1)}: {String(page.users.length)} users
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {page.users.map((user, userIndex) => (
                    <li
                      className="border-l-2 border-violet-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200"
                      key={user.id}
                    >
                      <strong>{`#${String(pageIndex * PAGE_SIZE + userIndex + 1)} ${user.name}`}</strong>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton
              disabled={!userPages.hasNextPage || userPages.isFetchingNextPage}
              onClick={() => void userPages.fetchNextPage()}
              type="button"
            >
              {userPages.isFetchingNextPage
                ? 'Loading next page…'
                : userPages.hasNextPage
                  ? `Load next ${String(nextPageSize)} users`
                  : 'All users loaded'}
            </ActionButton>
            <span className="text-sm font-medium text-zinc-400">
              {String(pageCount)} {pageCount === 1 ? 'page' : 'pages'} in the cache
            </span>
          </div>
        </div>
      </div>

      <div className="border border-l-2 border-zinc-800 border-l-violet-600 bg-violet-950/10 p-5">
        <h3 className="display-heading text-2xl font-bold text-zinc-100">
          Watch the same RPC stream two ways
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Keep the full timeline or replay with room for only the newest two updates. The live query
          shows only the newest state.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div
            aria-label="Accumulated stream history"
            role="region"
            className="border border-zinc-800 bg-black p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="display-heading text-sm font-bold text-violet-300">
                Accumulated stream: {boundedHistory ? 'newest 2 updates' : 'keeps history'}
              </p>
              <span className="border border-violet-900 bg-violet-950/80 px-3 py-1 text-xs font-bold text-violet-200">
                {String(diagnostics.data?.length ?? 0)}{' '}
                {(diagnostics.data?.length ?? 0) === 1 ? 'update' : 'updates'} retained
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                disabled={diagnostics.isFetching}
                onClick={() => replayStream(false)}
                type="button"
                variant="secondary"
              >
                Replay full history
              </ActionButton>
              <ActionButton
                disabled={diagnostics.isFetching}
                onClick={() => replayStream(true)}
                type="button"
                variant="secondary"
              >
                Replay newest 2
              </ActionButton>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              {boundedHistory
                ? 'Older updates are discarded as new ones arrive.'
                : 'Every update is retained.'}
            </p>
            <ol className="mt-3 grid gap-2">
              {diagnostics.data?.map((status, index) => (
                <li className="flex items-center gap-3 text-sm" key={status}>
                  <span className="grid size-7 place-items-center border border-violet-900 bg-violet-950 font-bold text-violet-200">
                    {String(index + 1)}
                  </span>
                  <span>{status}</span>
                </li>
              )) ?? <li className="text-sm text-zinc-500">Waiting for the first update…</li>}
            </ol>
          </div>
          <div className="border border-zinc-800 bg-black p-4">
            <p className="display-heading text-sm font-bold text-violet-300">
              Live query: latest only
            </p>
            <p className="display-heading mt-5 text-2xl font-black text-zinc-50">
              Current state: {liveDiagnostic.data ?? 'Waiting for an update…'}
            </p>
            <p className="mt-2 text-sm text-zinc-500">Earlier values are replaced.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
