import {
  DiagnosticFailure,
  exampleRpcGroup,
  ExampleAuthorization,
  ExampleAuthorizationError,
  type SeedUser,
  User,
} from '@effect-rpc-query/contracts'
import { Effect, Layer, Ref, Stream } from 'effect'

import { makeDiagnosticOperations } from './diagnostic-operations.ts'

const initialUsers = [
  new User({ id: 1, locale: 'en', name: 'Ada Lovelace' }),
  new User({ id: 2, locale: 'de', name: 'Edsger Dijkstra' }),
] as const satisfies ReadonlyArray<User>

interface ServerState {
  readonly nextUserId: number
  readonly users: ReadonlyArray<User>
}

const initialState = (): ServerState => ({
  nextUserId: 3,
  users: initialUsers,
})

const makeUser = (id: number, { locale, name }: SeedUser): User =>
  new User({ id, locale: locale ?? 'en', name })

const handlersLayer = exampleRpcGroup.toLayer(
  Effect.gen(function* () {
    const state = yield* Ref.make(initialState())
    const diagnostics = yield* makeDiagnosticOperations()

    return exampleRpcGroup.of({
      'diagnostics.cancel': Effect.fn('ExampleRpc.diagnostics.cancel')(
        ({ operationId }: { readonly operationId: string }) => diagnostics.cancel(operationId),
      ),
      'diagnostics.fail': Effect.fn('ExampleRpc.diagnostics.fail')(() =>
        Effect.fail(
          new DiagnosticFailure({
            reason: 'requested-failure',
          }),
        ),
      ),
      'diagnostics.slow': diagnostics.slow,
      'diagnostics.status': Effect.fn('ExampleRpc.diagnostics.status')(() => diagnostics.status),
      'diagnostics.stream': () => Stream.make('first', 'second'),
      'testing.reset': Effect.fn('ExampleRpc.testing.reset')(function* () {
        yield* diagnostics.reset
        yield* Ref.set(state, initialState())
      }),
      'testing.seed': Effect.fn('ExampleRpc.testing.seed')(
        ({ users }: { readonly users: ReadonlyArray<SeedUser> }) =>
          Ref.modify(state, (current) => {
            const seeded = users.map((user, index) => makeUser(index + 1, user))
            return [
              seeded,
              {
                ...current,
                nextUserId: seeded.length + 1,
                users: seeded,
              },
            ] as const
          }),
      ),
      'users.create': Effect.fn('ExampleRpc.users.create')((payload: SeedUser) =>
        Ref.modify(state, (current) => {
          const user = makeUser(current.nextUserId, payload)
          return [
            user,
            {
              ...current,
              nextUserId: current.nextUserId + 1,
              users: [...current.users, user],
            },
          ] as const
        }),
      ),
      'users.delete': Effect.fn('ExampleRpc.users.delete')(({ id }: { readonly id: number }) =>
        Ref.modify(state, (current) => {
          const exists = current.users.some((user) => user.id === id)
          return [
            exists,
            exists
              ? {
                  ...current,
                  users: current.users.filter((user) => user.id !== id),
                }
              : current,
          ] as const
        }).pipe(
          Effect.flatMap((exists) =>
            exists ? Effect.void : Effect.fail('user-not-found' as const),
          ),
        ),
      ),
      'users.get': Effect.fn('ExampleRpc.users.get')(
        ({ id, locale }: { readonly id: number; readonly locale?: string }) =>
          Ref.get(state).pipe(
            Effect.flatMap((current) => {
              const user = current.users.find((candidate) => candidate.id === id)
              return user === undefined
                ? Effect.fail('user-not-found' as const)
                : Effect.succeed(
                    new User({
                      id: user.id,
                      locale: locale ?? 'en',
                      name: user.name,
                    }),
                  )
            }),
          ),
      ),
      'users.list': Effect.fn('ExampleRpc.users.list')(() =>
        Ref.get(state).pipe(Effect.map((current) => current.users)),
      ),
    })
  }),
)

const authorizationLayer = Layer.succeed(
  ExampleAuthorization,
  ExampleAuthorization.of((effect, { headers }) =>
    headers['x-example-authorization'] === 'allowed'
      ? effect
      : Effect.fail(
          new ExampleAuthorizationError({
            reason: 'missing-example-authorization',
          }),
        ),
  ),
)

export const exampleRpcHandlersLayer = Layer.mergeAll(handlersLayer, authorizationLayer)
