import { Cause } from 'effect'
import { isEffectRpcQueryError } from 'effect-rpc-query'

const alertClassName =
  'mt-4 border border-red-900/80 border-l-4 border-l-red-600 bg-red-950/50 p-3 text-sm whitespace-pre-wrap text-red-200'

export const EffectErrorDetails = ({ error }: { readonly error: unknown }) => {
  if (isEffectRpcQueryError(error)) {
    return (
      <p className={alertClassName} role="alert">
        {error.name} from {error.rpcTag} ({error.operation}){'\n'}
        {Cause.pretty(error.cause)}
      </p>
    )
  }

  return error instanceof Error ? (
    <p className={alertClassName} role="alert">
      {error.name}: {error.message}
    </p>
  ) : null
}
