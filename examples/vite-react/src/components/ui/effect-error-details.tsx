import { Cause } from 'effect'
import { isEffectRpcQueryError } from 'effect-rpc-query'

export const EffectErrorDetails = ({ error }: { readonly error: unknown }) => {
  if (isEffectRpcQueryError(error)) {
    return (
      <p
        className="border-l-4 border-red-700 bg-red-50 p-3 text-sm whitespace-pre-wrap text-red-900"
        role="alert"
      >
        {error.name} from {error.rpcTag} ({error.operation})
        <br />
        {Cause.pretty(error.cause)}
      </p>
    )
  }

  return error instanceof Error ? (
    <p
      className="border-l-4 border-red-700 bg-red-50 p-3 text-sm whitespace-pre-wrap text-red-900"
      role="alert"
    >
      {error.name}: {error.message}
    </p>
  ) : null
}
