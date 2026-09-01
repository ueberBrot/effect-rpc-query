import { useMutation } from '@tanstack/react-query'

import {
  type SlowQueryCancellationState,
  useSlowQueryCancellation,
} from '../../hooks/use-slow-query-cancellation.ts'
import type { ViteReactApplication } from '../../lib/application.ts'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'

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
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-950/5">
      <h2 className="text-xl font-bold text-slate-950">Errors and cancellation</h2>
      <div className="flex flex-wrap gap-3">
        <ActionButton onClick={() => declaredFailure.mutate(undefined)} type="button">
          Trigger declared failure
        </ActionButton>
        <ActionButton
          disabled={!slowQuery.canStart}
          onClick={() => void slowQuery.start()}
          type="button"
        >
          Start slow query
        </ActionButton>
        <ActionButton
          disabled={!slowQuery.canCancel}
          onClick={() => void slowQuery.cancel()}
          type="button"
        >
          Cancel query
        </ActionButton>
      </div>
      <EffectErrorDetails error={declaredFailure.error} />
      {slowQuery.state._tag === 'Failed' ? (
        <EffectErrorDetails error={slowQuery.state.error} />
      ) : null}
      {message === undefined ? null : <p className="text-sm">{message}</p>}
    </section>
  )
}
