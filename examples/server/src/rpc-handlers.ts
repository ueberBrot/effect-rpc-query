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

const handlersLayer = exampleRpcGroup.toLayer(
  Effect.gen(function* () {
    const state = yield* Ref.make(initialState())
    const diagnostics = yield* makeDiagnosticOperations()

    return exampleRpcGroup.of({
      'diagnostics.cancel': ({ operationId }) => diagnostics.cancel(operationId),
      'diagnostics.fail': () =>
        Effect.fail(
          new DiagnosticFailure({
            reason: 'requested-failure',
          }),
        ),
      'diagnostics.slow': diagnostics.slow,
      'diagnostics.status': () => diagnostics.status,
      'diagnostics.stream': () => Stream.make('first', 'second'),
      'testing.reset': () =>
        Effect.gen(function* () {
          yield* diagnostics.reset
          yield* Ref.set(state, initialState())
        }),
      'testing.seed': ({ users }) =>
        Ref.modify(state, (current) => {
          const seeded = users.map(
            (user, index) =>
              new User({
                id: index + 1,
                locale: user.locale ?? 'en',
                name: user.name,
              }),
          )
          return [
            seeded,
            {
              ...current,
              nextUserId: seeded.length + 1,
              users: seeded,
            },
          ] as const
        }),
      'users.create': ({ locale, name }: SeedUser) =>
        Ref.modify(state, (current) => {
          const user = new User({
            id: current.nextUserId,
            locale: locale ?? 'en',
            name,
          })
          return [
            user,
            {
              ...current,
              nextUserId: current.nextUserId + 1,
              users: [...current.users, user],
            },
          ] as const
        }),
      'users.delete': ({ id }) =>
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
      'users.get': ({ id, locale }) =>
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
      'users.list': () => Ref.get(state).pipe(Effect.map((current) => current.users)),
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
