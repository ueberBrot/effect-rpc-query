import { Function, Predicate, SchemaAST } from 'effect'

// Runtime Schema metadata erases encoding service types. Conservatively require a
// custom encoder for encoding-side middleware; decoding-only middleware uses identity.
export const containsUnsafeKeyEncoding = (
  value: unknown,
  seen = new WeakSet<object>(),
): boolean => {
  if (!Predicate.isObjectOrArray(value) || seen.has(value)) {
    return false
  }
  seen.add(value)

  const transformation = value as { readonly _tag?: unknown; readonly encode?: unknown }
  if (transformation._tag === 'Middleware') {
    return transformation.encode !== Function.identity
  }

  if (SchemaAST.isAST(value)) {
    const representation = value.annotations?.['representation'] as
      | { readonly id?: unknown }
      | undefined
    if (representation?.id === 'effect/schema/Redacted') {
      return true
    }
    if (SchemaAST.isSuspend(value)) {
      try {
        if (containsUnsafeKeyEncoding(value.thunk(), seen)) return true
      } catch {
        return true
      }
    }
  }

  return Object.values(value).some((child) =>
    Array.isArray(child)
      ? child.some((element) => containsUnsafeKeyEncoding(element, seen))
      : containsUnsafeKeyEncoding(child, seen),
  )
}
