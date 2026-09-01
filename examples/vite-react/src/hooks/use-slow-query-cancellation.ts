import type { DiagnosticStatus } from '@effect-rpc-query/contracts'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import type { ViteReactApplication } from '../lib/application.ts'

const slowInput = {
  durationMs: 60_000,
  operationId: 'vite-react-slow-query',
} as const

export type SlowQueryCancellationState =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Starting' }
  | { readonly _tag: 'Ready' }
  | { readonly _tag: 'Cancelling' }
  | { readonly _tag: 'Cancelled'; readonly interruptions: number }
  | { readonly _tag: 'Failed'; readonly error: unknown }

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, milliseconds)
  })

/** Owns the complete start-observe-cancel-observe flow for one slow RPC query. */
export const useSlowQueryCancellation = ({ queryClient, rpc }: ViteReactApplication) => {
  const [state, setState] = useState<SlowQueryCancellationState>({ _tag: 'Idle' })
  const baseline = useRef<DiagnosticStatus | undefined>(undefined)
  const slowQuery = useQuery(
    rpc.diagnostics.slow.queryOptions({
      enabled: false,
      input: slowInput,
    }),
  )

  const readStatus = () =>
    queryClient.fetchQuery({
      ...rpc.diagnostics.status.queryOptions(),
      staleTime: 0,
    })

  const waitForStatus = async (
    predicate: (status: DiagnosticStatus) => boolean,
  ): Promise<DiagnosticStatus> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const status = await readStatus()
      if (predicate(status)) return status
      await delay(10)
    }
    throw new Error('Timed out waiting for diagnostic status')
  }

  const start = async () => {
    setState({ _tag: 'Starting' })
    try {
      const before = await readStatus()
      baseline.current = before
      void slowQuery.refetch()
      await waitForStatus(({ started }) => started > before.started)
      setState({ _tag: 'Ready' })
    } catch (error) {
      setState({ _tag: 'Failed', error })
    }
  }

  const cancel = async () => {
    const before = baseline.current
    if (before === undefined) return

    setState({ _tag: 'Cancelling' })
    try {
      await queryClient.cancelQueries({ queryKey: rpc.diagnostics.slow.queryKey(slowInput) })
      const status = await waitForStatus(({ interrupted }) => interrupted > before.interrupted)
      setState({ _tag: 'Cancelled', interruptions: status.interrupted })
    } catch (error) {
      setState({ _tag: 'Failed', error })
    }
  }

  return {
    cancel,
    canCancel: state._tag === 'Ready',
    canStart: !['Cancelling', 'Ready', 'Starting'].includes(state._tag),
    start,
    state,
  } as const
}
