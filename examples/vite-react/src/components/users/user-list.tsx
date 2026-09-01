import type { User } from '@effect-rpc-query/contracts'
import { useMutation } from '@tanstack/react-query'

import type { ViteReactApplication } from '../../lib/application.ts'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'

export const UserList = ({
  application,
  users,
}: {
  readonly application: ViteReactApplication
  readonly users: ReadonlyArray<User> | undefined
}) => {
  const { queryClient, rpc } = application
  const deleteUser = useMutation(
    rpc.users.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: rpc.users.key() }),
    }),
  )

  return (
    <>
      <ul className="grid gap-3">
        {users?.map((user) => (
          <li
            className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
            key={user.id}
          >
            <span className="grid gap-0.5">
              <strong className="text-slate-950">{user.name}</strong>
              <span className="text-sm text-slate-500">
                User {user.id}, locale {user.locale}
              </span>
            </span>
            <ActionButton
              aria-label={`Delete ${user.name}`}
              disabled={deleteUser.isPending && deleteUser.variables.id === user.id}
              onClick={() => deleteUser.mutate({ id: user.id })}
              type="button"
            >
              Delete
            </ActionButton>
          </li>
        ))}
      </ul>
      <EffectErrorDetails error={deleteUser.error} />
    </>
  )
}
