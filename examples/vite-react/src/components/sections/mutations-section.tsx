import { useMutation, useQuery } from '@tanstack/react-query'

import type { ViteReactApplication } from '../../lib/application.ts'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'
import { CreateUserForm } from '../users/create-user-form.tsx'

export const MutationsSection = ({
  application,
}: {
  readonly application: ViteReactApplication
}) => {
  const { queryClient, rpc } = application
  const voidQuery = useQuery(
    rpc.diagnostics.cancel.queryOptions({
      enabled: false,
      input: { operationId: 'no-active-operation' },
    }),
  )
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: rpc.users.key() })
  const resetUsers = useMutation(rpc.testing.reset.mutationOptions({ onSuccess: invalidateUsers }))
  const seedUsers = useMutation(rpc.testing.seed.mutationOptions({ onSuccess: invalidateUsers }))

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-950/5">
      <h2 className="text-xl font-bold text-slate-950">Mutations and void results</h2>
      <CreateUserForm application={application} />
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={() =>
            seedUsers.mutate({
              users: [{ name: 'Grace Hopper' }, { name: 'Margaret Hamilton' }],
            })
          }
          type="button"
        >
          Load sample users
        </ActionButton>
        <ActionButton onClick={() => resetUsers.mutate(undefined)} type="button">
          Reset list
        </ActionButton>
        <ActionButton onClick={() => void voidQuery.refetch()} type="button">
          Run void query
        </ActionButton>
      </div>
      <EffectErrorDetails error={seedUsers.error ?? resetUsers.error} />
      {resetUsers.isSuccess ? (
        <p className="text-sm">Void mutation returned {String(resetUsers.data)}</p>
      ) : null}
      {voidQuery.isSuccess ? (
        <p className="text-sm">Void query returned {String(voidQuery.data)}</p>
      ) : null}
    </section>
  )
}
