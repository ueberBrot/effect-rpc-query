import { useMutation } from '@tanstack/react-query'

import type { ViteReactApplication } from './application.ts'
import { EffectErrorDetails } from './effect-error-details.tsx'
import {
  type SlowQueryCancellationState,
  useSlowQueryCancellation,
} from './use-slow-query-cancellation.ts'

const describeSlowQuery = (state: SlowQueryCancellationState): string | undefined => {
  switch (state._tag) {
    case 'Idle':
      return undefined
    case 'Starting':
      return 'Starting slow query...'
    case 'Ready':
      return 'Ready to cancel'
    case 'Cancelling':
      return 'Cancelling slow query...'
    case 'Cancelled':
      return `Server recorded ${String(state.interruptions)} ${
        state.interruptions === 1 ? 'interruption' : 'interruptions'
      }`
    case 'Failed':
      return 'Slow query failed'
  }
}

export const DiagnosticsSection = ({
  application,
}: {
  readonly application: ViteReactApplication
}) => {
  const declaredFailure = useMutation(application.rpc.diagnostics.fail.mutationOptions())
  const slowQuery = useSlowQueryCancellation(application)
  const message = describeSlowQuery(slowQuery.state)

  return (
    <section>
      <h2>Errors and cancellation</h2>
      <div className="actions">
        <button onClick={() => declaredFailure.mutate(undefined)} type="button">
          Trigger declared failure
        </button>
        <button disabled={!slowQuery.canStart} onClick={() => void slowQuery.start()} type="button">
          Start slow query
        </button>
        <button
          disabled={!slowQuery.canCancel}
          onClick={() => void slowQuery.cancel()}
          type="button"
        >
          Cancel query
        </button>
      </div>
      <EffectErrorDetails error={declaredFailure.error} />
      {slowQuery.state._tag === 'Failed' ? (
        <EffectErrorDetails error={slowQuery.state.error} />
      ) : null}
      {message === undefined ? null : <p>{message}</p>}
    </section>
  )
}
