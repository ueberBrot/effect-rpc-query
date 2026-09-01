import { exampleRpcGroup, type DiagnosticStatus } from '@effect-rpc-query/contracts'
import { type ExampleRpcClient, startExampleRpcClient } from '@effect-rpc-query/contracts/client'
import { type QueryClient, useQuery } from '@tanstack/react-query'
import { createRpcQueryUtils, type RunPromiseExit } from 'effect-rpc-query'
import { useRef, useState } from 'react'

const makeExampleRpcQueryUtils = (
  client: ExampleRpcClient,
  runPromiseExit: RunPromiseExit,
  keyPrefix: string,
) =>
  createRpcQueryUtils(exampleRpcGroup, {
    client,
    keyPrefix: [keyPrefix] as const,
    runPromiseExit,
  })

export type ExampleRpcQueryUtils = ReturnType<typeof makeExampleRpcQueryUtils>

export interface StartExampleReactApplicationOptions {
  readonly keyPrefix: string
  readonly queryClient: QueryClient
  readonly rpcUrl: string
}

export interface StartedExampleReactApplication {
  readonly dispose: () => Promise<void>
  readonly queryClient: QueryClient
  readonly rpcQuery: ExampleRpcQueryUtils
}

/** Combines app-owned QueryClient policy with the shared RPC resource lifecycle. */
export const startExampleReactApplication = async ({
  keyPrefix,
  queryClient,
  rpcUrl,
}: StartExampleReactApplicationOptions): Promise<StartedExampleReactApplication> => {
  const rpcClient = await startExampleRpcClient(rpcUrl)
  let disposal: Promise<void> | undefined
  const dispose = () => {
    disposal ??= (async () => {
      try {
        await queryClient.cancelQueries()
      } finally {
        queryClient.clear()
        await rpcClient.dispose()
      }
    })()
    return disposal
  }

  try {
    return {
      dispose,
      queryClient,
      rpcQuery: makeExampleRpcQueryUtils(rpcClient.client, rpcClient.runPromiseExit, keyPrefix),
    }
  } catch (cause) {
    try {
      await dispose()
    } catch (cleanupCause) {
      throw new AggregateError([cause, cleanupCause], 'Application startup and cleanup failed')
    }
    throw cause
  }
}

export type SlowQueryCancellationState =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Starting' }
  | { readonly _tag: 'Ready' }
  | { readonly _tag: 'Cancelling' }
  | { readonly _tag: 'Cancelled'; readonly interruptions: number }
  | { readonly _tag: 'Failed'; readonly error: unknown }

export const describeSlowQueryCancellation = (
  state: SlowQueryCancellationState,
): string | undefined => {
  switch (state._tag) {
    case 'Idle':
      return undefined
    case 'Starting':
      return 'Starting query…'
    case 'Ready':
      return 'Ready to cancel'
    case 'Cancelling':
      return 'Cancelling query…'
    case 'Cancelled':
      return `Server interruptions: ${String(state.interruptions)}`
    case 'Failed':
      return 'Slow query failed'
  }
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, milliseconds)
  })

export interface SlowQueryCancellationOptions {
  readonly application: Pick<StartedExampleReactApplication, 'queryClient' | 'rpcQuery'>
  readonly operationId: string
}

/** Owns the start-observe-cancel-observe flow shared by the React examples. */
export const useSlowQueryCancellation = ({
  application: { queryClient, rpcQuery },
  operationId,
}: SlowQueryCancellationOptions) => {
  const slowInput = { durationMs: 60_000, operationId } as const
  const [state, setState] = useState<SlowQueryCancellationState>({ _tag: 'Idle' })
  const baseline = useRef<DiagnosticStatus | undefined>(undefined)
  const slowQuery = useQuery(
    rpcQuery.diagnostics.slow.queryOptions({
      enabled: false,
      input: slowInput,
    }),
  )
  const readStatus = () =>
    queryClient.query({
      ...rpcQuery.diagnostics.status.queryOptions(),
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
      await queryClient.cancelQueries({
        queryKey: rpcQuery.diagnostics.slow.queryKey(slowInput),
      })
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
