import { skipToken } from '@tanstack/query-core'
import type { QueryKey } from '@tanstack/query-core'
import { Effect, Exit } from 'effect'
import type { Rpc, RpcClient, RpcGroup } from 'effect/unstable/rpc'

import { EffectRpcQueryConfigError, EffectRpcQueryError, EffectRpcQueryKeyError } from './errors'
import {
  extractUnaryRpcs,
  type AdaptedKeyPayload,
  type AdaptedUnaryRpc,
} from './internal/effect-rpc-adapter'
import type { CreateRpcQueryUtilsOptions, JsonValue, RpcQueryUtils, RunPromiseExit } from './types'

const reservedPathSegments = new Set([
  '__proto__',
  'constructor',
  'infiniteKey',
  'infiniteOptions',
  'key',
  'mutationKey',
  'mutationOptions',
  'prototype',
  'queryKey',
  'queryOptions',
])

type RuntimeKeyEncoder = (payload: unknown) => JsonValue

interface PreparedPayload {
  readonly canonical: JsonValue
  readonly normalized: unknown
}

interface PreparedQuery {
  readonly input: unknown
  readonly key: readonly JsonValue[]
}

interface ValidatedRpcPath {
  readonly rpc: AdaptedUnaryRpc
  readonly segments: readonly [string, ...string[]]
}

const canonicalizeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw new TypeError('Key values must contain only finite numbers')
  }
  return Object.is(value, -0) ? 0 : value
}

const canonicalizeArray = (value: unknown[], seen: WeakSet<object>): JsonValue => {
  const copy: Array<JsonValue> = []
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw new TypeError('Key values must not contain sparse arrays')
    }
    copy.push(canonicalize(value[index], seen))
  }
  // Shared references are valid JSON; only references on the active path form cycles.
  seen.delete(value)
  return Object.freeze(copy)
}

const canonicalizeObject = (value: object, seen: WeakSet<object>): JsonValue => {
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Key values must contain only plain objects')
  }

  const copy: Record<string, JsonValue> = {}
  for (const key of Object.keys(value).sort()) {
    // defineProperty preserves an own "__proto__" key instead of invoking its setter.
    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable: true,
      value: canonicalize((value as Record<string, unknown>)[key], seen),
      writable: true,
    })
  }
  seen.delete(value)
  return Object.freeze(copy)
}

// Copying prevents caller mutation; sorting makes equivalent objects hash identically.
const canonicalize = (value: unknown, seen: WeakSet<object> = new WeakSet()): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return canonicalizeNumber(value)
  }

  if (typeof value !== 'object') {
    throw new TypeError('Key values must be JSON-safe')
  }

  if (seen.has(value)) {
    throw new TypeError('Key values must not contain cycles')
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return canonicalizeArray(value, seen)
  }

  return canonicalizeObject(value, seen)
}

const freezeKey = (parts: ReadonlyArray<JsonValue | string>) => Object.freeze([...parts])

// JSON.stringify observes own "__proto__" properties that Query Core's object reducer drops.
const hashCanonicalKey = (queryKey: QueryKey): string => JSON.stringify(queryKey)

const normalizePrefix = (prefix: readonly [JsonValue, ...JsonValue[]]): readonly JsonValue[] => {
  if (!Array.isArray(prefix) || prefix.length === 0) {
    throw new EffectRpcQueryConfigError(
      'InvalidKeyPrefix',
      'keyPrefix must be a non-empty readonly tuple of JSON-safe values',
    )
  }

  try {
    return Object.freeze(prefix.map((part) => canonicalize(part)))
  } catch (cause) {
    throw new EffectRpcQueryConfigError(
      'InvalidKeyPrefix',
      'keyPrefix must contain only JSON-safe values',
      { cause },
    )
  }
}

const rpcPathCollision = (rpcTag: string, path: string, relation: 'collides with' | 'duplicates') =>
  new EffectRpcQueryConfigError(
    'RpcPathCollision',
    `RPC tag ${rpcTag} ${relation} utility path ${path}`,
    { path, rpcTag },
  )

// Parse and validate every path before allocation so configuration failure stays atomic.
const planRpcPaths = (rpcs: ReadonlyArray<AdaptedUnaryRpc>) => {
  const branchPaths = new Map<string, string>()
  const leafPaths = new Set<string>()
  const plan: Array<ValidatedRpcPath> = []

  for (const rpc of rpcs) {
    const parsedSegments = rpc.tag.split('.')
    if (
      parsedSegments.some((segment) => segment.length === 0 || reservedPathSegments.has(segment))
    ) {
      throw new EffectRpcQueryConfigError(
        'InvalidRpcPath',
        `RPC tag ${rpc.tag} cannot be projected into a utility path`,
        { rpcTag: rpc.tag },
      )
    }
    const segments = parsedSegments as [string, ...string[]]

    if (leafPaths.has(rpc.tag)) {
      throw rpcPathCollision(rpc.tag, rpc.tag, 'duplicates')
    }

    const descendantPath = branchPaths.get(rpc.tag)
    if (descendantPath !== undefined) {
      throw rpcPathCollision(rpc.tag, descendantPath, 'collides with')
    }

    const rpcBranchPaths: Array<string> = []
    for (let index = 1; index < segments.length; index += 1) {
      const branchPath = segments.slice(0, index).join('.')
      if (leafPaths.has(branchPath)) {
        throw rpcPathCollision(rpc.tag, branchPath, 'collides with')
      }
      rpcBranchPaths.push(branchPath)
    }

    for (const branchPath of rpcBranchPaths) {
      if (!branchPaths.has(branchPath)) {
        branchPaths.set(branchPath, rpc.tag)
      }
    }

    leafPaths.add(rpc.tag)
    plan.push({ rpc, segments })
  }

  return plan
}

const preparePayload = (
  rpcTag: string,
  keyPayload: Exclude<AdaptedKeyPayload, { readonly _tag: 'Payloadless' }>,
  input: unknown,
  keyEncoder: RuntimeKeyEncoder | undefined,
): PreparedPayload => {
  let normalized: unknown
  try {
    normalized = keyPayload.make(input)
  } catch (cause) {
    throw new EffectRpcQueryKeyError(
      'PayloadConstructionFailed',
      rpcTag,
      `Could not construct the payload for RPC ${rpcTag}`,
      cause,
    )
  }

  let encoded: unknown
  try {
    encoded = keyEncoder
      ? keyEncoder(normalized)
      : keyPayload._tag === 'DefaultEncoding'
        ? keyPayload.encode(normalized)
        : undefined
  } catch (cause) {
    throw new EffectRpcQueryKeyError(
      keyEncoder ? 'KeyEncoderFailed' : 'PayloadEncodingFailed',
      rpcTag,
      `Could not encode the key payload for RPC ${rpcTag}`,
      cause,
    )
  }

  try {
    return { canonical: canonicalize(encoded), normalized }
  } catch (cause) {
    throw new EffectRpcQueryKeyError(
      'InvalidKeyValue',
      rpcTag,
      `The key payload for RPC ${rpcTag} is not JSON-safe`,
      cause,
    )
  }
}

const execute = async (
  rpc: AdaptedUnaryRpc,
  operation: 'infinite' | 'mutation' | 'query',
  input: unknown,
  runPromiseExit: RunPromiseExit<unknown>,
  signal?: AbortSignal,
) => {
  const effect = rpc.invoke(input)
  // Await outside the Exit branch so a runner rejection passes through untouched.
  const exit = await runPromiseExit(effect, signal === undefined ? undefined : { signal })

  if (Exit.isFailure(exit)) {
    throw new EffectRpcQueryError(rpc.tag, operation, exit.cause)
  }

  // TanStack rejects successful undefined query data; mutations keep it unchanged.
  return operation !== 'mutation' && exit.value === undefined ? null : exit.value
}

const defineKey = (target: Record<string, unknown>, parts: ReadonlyArray<JsonValue | string>) => {
  const key = freezeKey(parts)
  target['key'] = () => key
}

const prepareQuery = (
  rpc: AdaptedUnaryRpc,
  input: unknown,
  queryOperationKey: readonly JsonValue[],
  keyEncoder: RuntimeKeyEncoder | undefined,
): PreparedQuery => {
  if (rpc.keyPayload._tag === 'Payloadless') {
    return { input: undefined, key: queryOperationKey }
  }

  const prepared = preparePayload(rpc.tag, rpc.keyPayload, input, keyEncoder)
  return {
    // The ready client constructs this normalized payload again during execution.
    input: prepared.normalized,
    key: freezeKey([...queryOperationKey, prepared.canonical]),
  }
}

const createLeaf = (
  rpc: AdaptedUnaryRpc,
  rpcKeyParts: ReadonlyArray<JsonValue | string>,
  keyEncoder: RuntimeKeyEncoder | undefined,
  runPromiseExit: RunPromiseExit<unknown>,
) => {
  const rpcKey = freezeKey(rpcKeyParts)
  const infiniteOperationKey = freezeKey([...rpcKey, 'infinite'])
  const queryOperationKey = freezeKey([...rpcKey, 'query'])
  const mutationKey = freezeKey([...rpcKey, 'mutation'])

  const infiniteKey = (input?: unknown) =>
    prepareQuery(rpc, input, infiniteOperationKey, keyEncoder).key

  const infiniteOptions = (argument: Record<string, unknown>) => {
    const options = { ...argument }
    const input = options['input']
    delete options['input']

    if (rpc.keyPayload._tag !== 'Payloadless' && input === skipToken) {
      return {
        ...options,
        queryFn: skipToken,
        queryKey: infiniteOperationKey,
        queryKeyHashFn: hashCanonicalKey,
      }
    }

    const initialPageParam = options['initialPageParam']
    const inputForPage =
      rpc.keyPayload._tag === 'Payloadless'
        ? () => undefined
        : (input as (pageParam: unknown) => unknown)
    const initialInput = inputForPage(initialPageParam)
    const prepared = prepareQuery(rpc, initialInput, infiniteOperationKey, keyEncoder)

    return {
      ...options,
      queryFn: ({
        pageParam,
        signal,
      }: {
        readonly pageParam: unknown
        readonly signal: AbortSignal
      }) => {
        const pageInput = inputForPage(pageParam)
        const normalizedInput =
          rpc.keyPayload._tag === 'Payloadless' ? undefined : rpc.keyPayload.make(pageInput)
        return execute(rpc, 'infinite', normalizedInput, runPromiseExit, signal)
      },
      queryKey: prepared.key,
      queryKeyHashFn: hashCanonicalKey,
    }
  }

  const queryKey = (input?: unknown) => prepareQuery(rpc, input, queryOperationKey, keyEncoder).key

  const queryOptions = (argument?: unknown) => {
    if (rpc.keyPayload._tag !== 'Payloadless' && argument === skipToken) {
      return {
        queryFn: skipToken,
        queryKey: queryOperationKey,
        queryKeyHashFn: hashCanonicalKey,
      }
    }

    const suppliedOptions =
      argument !== undefined && typeof argument === 'object'
        ? (argument as Record<string, unknown>)
        : {}

    const options = { ...suppliedOptions }
    const prepared = prepareQuery(rpc, options['input'], queryOperationKey, keyEncoder)
    delete options['input']

    return {
      // Owned fields follow user options so callers cannot replace keys or runners.
      ...options,
      queryFn: ({ signal }: { readonly signal: AbortSignal }) =>
        execute(rpc, 'query', prepared.input, runPromiseExit, signal),
      queryKey: prepared.key,
      queryKeyHashFn: hashCanonicalKey,
    }
  }

  const mutationOptions = (options: Record<string, unknown> = {}) => ({
    ...options,
    mutationFn: (variables: unknown) => execute(rpc, 'mutation', variables, runPromiseExit),
    mutationKey,
  })

  return Object.freeze({
    infiniteKey,
    infiniteOptions,
    key: () => rpcKey,
    mutationKey: () => mutationKey,
    mutationOptions,
    queryKey,
    queryOptions,
  })
}

const deepFreezeTree = (value: Record<string, unknown>) => {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null) {
      deepFreezeTree(child as Record<string, unknown>)
    }
  }
  return Object.freeze(value)
}

const validateKeyEncoders = (
  rpcs: ReadonlyArray<AdaptedUnaryRpc>,
  keyEncoders: Record<string, RuntimeKeyEncoder>,
) => {
  const supportedTags = new Set(
    rpcs.filter((rpc) => rpc.keyPayload._tag !== 'Payloadless').map((rpc) => rpc.tag),
  )
  for (const tag of Object.keys(keyEncoders)) {
    if (!supportedTags.has(tag)) {
      throw new EffectRpcQueryConfigError(
        'UnknownKeyEncoder',
        `No unary RPC exists for key encoder ${tag}`,
        { rpcTag: tag },
      )
    }
  }

  for (const rpc of rpcs) {
    if (rpc.keyPayload._tag === 'CustomEncodingRequired' && keyEncoders[rpc.tag] === undefined) {
      throw new EffectRpcQueryConfigError(
        'MissingKeyEncoder',
        `RPC ${rpc.tag} requires a safe custom key encoder`,
        { rpcTag: rpc.tag },
      )
    }
  }
}

const insertLeaf = (
  tree: Record<string, unknown>,
  prefix: readonly JsonValue[],
  path: ValidatedRpcPath,
  keyEncoder: RuntimeKeyEncoder | undefined,
  runPromiseExit: RunPromiseExit<unknown>,
) => {
  const { rpc, segments } = path
  let branch = tree
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] as string
    let child = Object.hasOwn(branch, segment)
      ? (branch[segment] as Record<string, unknown>)
      : undefined
    if (child === undefined) {
      child = {}
      defineKey(child, [...prefix, ...segments.slice(0, index + 1)])
      branch[segment] = child
    }
    branch = child
  }

  const leafName = segments.at(-1) as string
  branch[leafName] = createLeaf(rpc, [...prefix, ...segments], keyEncoder, runPromiseExit)
}

const createTree = (
  prefix: readonly JsonValue[],
  paths: ReadonlyArray<ValidatedRpcPath>,
  keyEncoders: Record<string, RuntimeKeyEncoder>,
  runPromiseExit: RunPromiseExit<unknown>,
) => {
  const tree: Record<string, unknown> = {}
  defineKey(tree, prefix)

  for (const path of paths) {
    insertLeaf(tree, prefix, path, keyEncoders[path.rpc.tag], runPromiseExit)
  }
  return deepFreezeTree(tree)
}

/**
 * Derives an eager, frozen TanStack Query utility tree from an Effect RPC group.
 *
 * Dotted unary RPC tags become nested properties. Streaming RPCs are omitted.
 * The caller retains ownership of the ready client's Scope and lifecycle.
 *
 * @throws {@link EffectRpcQueryConfigError} if the prefix, paths, or encoders are invalid.
 */
export const createRpcQueryUtils = <
  const Group extends RpcGroup.Any,
  const Prefix extends readonly [JsonValue, ...JsonValue[]],
  ClientError = never,
>(
  group: Group,
  options: CreateRpcQueryUtilsOptions<Group, Prefix, ClientError>,
): RpcQueryUtils<Group, Prefix, ClientError> => {
  const runtimeGroup = group as unknown as RpcGroup.RpcGroup<Rpc.Any>
  const client = options.client as RpcClient.RpcClient.Flat<Rpc.Any, ClientError>
  const rpcs = extractUnaryRpcs(runtimeGroup, client)
  const prefix = normalizePrefix(options.keyPrefix)
  const paths = planRpcPaths(rpcs)

  const keyEncoders = (options.keyEncoders ?? {}) as Record<string, RuntimeKeyEncoder>
  validateKeyEncoders(rpcs, keyEncoders)

  const runPromiseExit = (options.runPromiseExit ??
    Effect.runPromiseExit) as RunPromiseExit<unknown>
  return createTree(prefix, paths, keyEncoders, runPromiseExit) as RpcQueryUtils<
    Group,
    Prefix,
    ClientError
  >
}
