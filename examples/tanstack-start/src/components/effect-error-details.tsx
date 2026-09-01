import { Cause } from 'effect'
import { isEffectRpcQueryError } from 'effect-rpc-query'

export const EffectErrorDetails = ({ error }: { readonly error: unknown }) => {
  if (isEffectRpcQueryError(error)) {
    return (
      <p className="alert" role="alert">
        {error.name} from {error.rpcTag} ({error.operation}){'\n'}
        {Cause.pretty(error.cause)}
      </p>
    )
  }

  return error instanceof Error ? (
    <p className="alert" role="alert">
      {error.name}: {error.message}
    </p>
  ) : null
}
