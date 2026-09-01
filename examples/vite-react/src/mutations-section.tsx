import { useMutation, useQuery } from '@tanstack/react-query'

import type { ViteReactApplication } from './application.ts'

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
  const createUser = useMutation(rpc.users.create.mutationOptions({ onSuccess: invalidateUsers }))
  const deleteUser = useMutation(rpc.users.delete.mutationOptions({ onSuccess: invalidateUsers }))
  const resetUsers = useMutation(rpc.testing.reset.mutationOptions({ onSuccess: invalidateUsers }))
  const seedUsers = useMutation(rpc.testing.seed.mutationOptions({ onSuccess: invalidateUsers }))

  return (
    <section>
      <h2>Mutations and void results</h2>
      <div className="actions">
        <button
          onClick={() =>
            seedUsers.mutate({
              users: [{ name: 'Grace Hopper' }, { name: 'Margaret Hamilton' }],
            })
          }
          type="button"
        >
          Load sample users
        </button>
        <button onClick={() => createUser.mutate({ name: 'Barbara Liskov' })} type="button">
          Add Barbara
        </button>
        <button onClick={() => deleteUser.mutate({ id: 2 })} type="button">
          Delete user 2
        </button>
        <button onClick={() => resetUsers.mutate(undefined)} type="button">
          Reset list
        </button>
        <button onClick={() => void voidQuery.refetch()} type="button">
          Run void query
        </button>
      </div>
      {createUser.data === undefined ? null : <p>Added {createUser.data.name}</p>}
      {resetUsers.isSuccess ? <p>Void mutation returned {String(resetUsers.data)}</p> : null}
      {voidQuery.isSuccess ? <p>Void query returned {String(voidQuery.data)}</p> : null}
    </section>
  )
}
