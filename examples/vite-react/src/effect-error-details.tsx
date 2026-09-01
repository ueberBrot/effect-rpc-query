import { Cause } from 'effect'
import { isEffectRpcQueryError } from 'effect-rpc-query'

export const EffectErrorDetails = ({ error }: { readonly error: unknown }) => {
  if (isEffectRpcQueryError(error)) {
    return (
      <p role="alert">
        {error.name} from {error.rpcTag} ({error.operation})
        <br />
        {Cause.pretty(error.cause)}
      </p>
    )
  }

  return error instanceof Error ? (
    <p role="alert">
      {error.name}: {error.message}
    </p>
  ) : null
}
