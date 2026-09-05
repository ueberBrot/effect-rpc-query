import { type CommandInput, CommandStatus } from '@effect-rpc-query/contracts'
import { Deferred, Effect, Scope } from 'effect'

interface Command {
  status: CommandStatus
  readonly cancellation: Deferred.Deferred<void>
  readonly done: Deferred.Deferred<CommandStatus>
}

export const makeCommands = Effect.fn('ExampleRpc.makeCommands')(function* () {
  const scope = yield* Scope.Scope
  const commands = new Map<string, Command>()

  const finish = Effect.fn('ExampleRpc.Commands.finish')(function* (
    command: Command,
    state: 'completed' | 'cancelled',
  ) {
    command.status = new CommandStatus({
      operationId: command.status.operationId,
      completedSteps: command.status.completedSteps,
      totalSteps: command.status.totalSteps,
      state,
    })
    yield* Deferred.succeed(command.done, command.status)
  })

  const work = Effect.fn('ExampleRpc.Commands.work')(
    function* (command: Command) {
      for (let step = 0; step < command.status.totalSteps; step += 1) {
        const cancelled = yield* Effect.raceFirst(
          Effect.sleep('100 millis').pipe(Effect.as(false)),
          Deferred.await(command.cancellation).pipe(Effect.as(true)),
        )
        if (cancelled) return yield* finish(command, 'cancelled')
        command.status = new CommandStatus({
          operationId: command.status.operationId,
          state: command.status.state,
          totalSteps: command.status.totalSteps,
          completedSteps: step + 1,
        })
      }
      yield* finish(command, 'completed')
    },
    (effect, command) => effect.pipe(Effect.onInterrupt(() => finish(command, 'cancelled'))),
  )

  const start = Effect.fn('ExampleRpc.Commands.start')(function* ({
    operationId,
    steps = 40,
  }: CommandInput) {
    let command = commands.get(operationId)
    if (command === undefined) {
      command = {
        status: new CommandStatus({
          operationId,
          state: 'running',
          completedSteps: 0,
          totalSteps: steps,
        }),
        cancellation: Deferred.makeUnsafe<void>(),
        done: Deferred.makeUnsafe<CommandStatus>(),
      }
      commands.set(operationId, command)
      yield* Effect.forkIn(work(command), scope)
    }
    return yield* Deferred.await(command.done)
  })

  const cancel = Effect.fn('ExampleRpc.Commands.cancel')(function* ({
    operationId,
  }: {
    readonly operationId: string
  }) {
    let command = commands.get(operationId)
    if (command === undefined) {
      // A cancel request may arrive before its start request.
      command = {
        status: new CommandStatus({
          operationId,
          state: 'cancelled',
          completedSteps: 0,
          totalSteps: 0,
        }),
        cancellation: Deferred.makeUnsafe<void>(),
        done: Deferred.makeUnsafe<CommandStatus>(),
      }
      commands.set(operationId, command)
      yield* Deferred.succeed(command.done, command.status)
    }
    yield* Deferred.succeed(command.cancellation, undefined)
    return yield* Deferred.await(command.done)
  })

  const status = Effect.fn('ExampleRpc.Commands.status')(
    ({ operationId }: { readonly operationId: string }) =>
      Effect.sync(() => commands.get(operationId)?.status ?? null),
  )

  const reset = Effect.gen(function* () {
    for (const command of commands.values()) {
      yield* Deferred.succeed(command.cancellation, undefined)
      yield* Deferred.await(command.done)
    }
    commands.clear()
  })

  return { start, cancel, status, reset }
})
