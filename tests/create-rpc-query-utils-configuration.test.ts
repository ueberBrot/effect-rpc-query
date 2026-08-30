import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Schema } from 'effect'
import { Rpc, RpcClient, RpcGroup } from 'effect/unstable/rpc'

import {
  createRpcQueryUtils,
  EffectRpcQueryConfigError,
  EffectRpcQueryKeyError,
  type CreateRpcQueryUtilsOptions,
  type JsonValue,
} from '#effect-rpc-query'

import { group, makeReadyClient } from './fixtures/effect-rpc'

describe('createRpcQueryUtils configuration', () => {
  it('reports invalid utility paths with a stable configuration error', () => {
    const InvalidPath = Rpc.make('invalid..path', { success: Schema.String })
    const invalidGroup = RpcGroup.make(InvalidPath)
    type InvalidRpcs = RpcGroup.Rpcs<typeof invalidGroup>

    expect(() =>
      createRpcQueryUtils(invalidGroup, {
        client: makeReadyClient() as unknown as RpcClient.RpcClient.Flat<InvalidRpcs>,
        keyPrefix: ['app'] as const,
      }),
    ).toThrow(
      expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
        _tag: 'EffectRpcQueryConfigError',
        code: 'InvalidRpcPath',
        rpcTag: 'invalid..path',
      }),
    )
  })

  it('reports non-JSON encoder output with a stable key error', () => {
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyEncoders: {
        // The cast simulates an encoder that violates its declared JSON contract at runtime.
        'users.get': () => ({ invalid: undefined }) as unknown as JsonValue,
      },
      keyPrefix: ['app'] as const,
    })

    expect(() => utils.users.get.queryKey({ id: 1 })).toThrow(
      expect.objectContaining<Partial<EffectRpcQueryKeyError>>({
        _tag: 'EffectRpcQueryKeyError',
        code: 'InvalidKeyValue',
        rpcTag: 'users.get',
      }),
    )
  })

  it('requires a custom key encoder for explicitly redacted payloads', () => {
    const Secret = Rpc.make('secrets.read', {
      payload: { secret: Schema.Redacted(Schema.String) },
      success: Schema.String,
    })
    const secretGroup = RpcGroup.make(Secret)
    type SecretRpcs = RpcGroup.Rpcs<typeof secretGroup>
    type SecretOptions = CreateRpcQueryUtilsOptions<typeof secretGroup, readonly ['app']>
    const unsafeOptions = {
      client: makeReadyClient() as unknown as RpcClient.RpcClient.Flat<SecretRpcs>,
      keyPrefix: ['app'] as const,
    } as unknown as SecretOptions

    expect(() => createRpcQueryUtils(secretGroup, unsafeOptions)).toThrow(
      expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
        _tag: 'EffectRpcQueryConfigError',
        code: 'MissingKeyEncoder',
        rpcTag: 'secrets.read',
      }),
    )
  })

  it('requires a custom key encoder for Schema encoding middleware', () => {
    class EncodingService extends Context.Service<EncodingService, { readonly suffix: string }>()(
      'EncodingService',
    ) {}
    const Payload = Schema.Struct({ value: Schema.String }).pipe(
      Schema.middlewareEncoding((encoding) => Effect.flatMap(EncodingService, () => encoding)),
    )
    const Serviceful = Rpc.make('encoding.serviceful', {
      payload: Payload,
      success: Schema.String,
    })
    const servicefulGroup = RpcGroup.make(Serviceful)
    type ServicefulRpcs = RpcGroup.Rpcs<typeof servicefulGroup>
    type ServicefulOptions = CreateRpcQueryUtilsOptions<typeof servicefulGroup, readonly ['app']>
    const unsafeOptions = {
      client: makeReadyClient() as unknown as RpcClient.RpcClient.Flat<ServicefulRpcs>,
      keyPrefix: ['app'] as const,
    } as unknown as ServicefulOptions

    expect(() => createRpcQueryUtils(servicefulGroup, unsafeOptions)).toThrow(
      expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
        code: 'MissingKeyEncoder',
        rpcTag: 'encoding.serviceful',
      }),
    )
  })

  it('treats annotated Void payload schemas as payloadless', () => {
    const NoPayload = Rpc.make('annotated.void', {
      payload: Schema.Void.pipe(Schema.annotate({ description: 'annotated void' })),
      success: Schema.String,
    })
    const noPayloadGroup = RpcGroup.make(NoPayload)
    type NoPayloadRpcs = RpcGroup.Rpcs<typeof noPayloadGroup>
    const utils = createRpcQueryUtils(noPayloadGroup, {
      client: makeReadyClient() as unknown as RpcClient.RpcClient.Flat<NoPayloadRpcs>,
      keyPrefix: ['app'] as const,
    })

    expect(utils.annotated.void.queryKey()).toEqual(['app', 'annotated', 'void', 'query'])
  })

  it('preserves an own __proto__ property in canonical payload keys', () => {
    const encoded = Object.defineProperty({}, '__proto__', {
      enumerable: true,
      value: 'semantic-value',
    }) as JsonValue
    const utils = createRpcQueryUtils(group, {
      client: makeReadyClient(),
      keyEncoders: { 'users.get': () => encoded },
      keyPrefix: ['app'] as const,
    })

    const canonical = utils.users.get.queryKey({ id: 1 }).at(-1)

    expect(Object.hasOwn(canonical as object, '__proto__')).toBe(true)
    expect((canonical as Record<string, JsonValue>)['__proto__']).toBe('semantic-value')

    const options = utils.users.get.queryOptions({ input: { id: 1 } })
    const emptyPayloadKey = [...options.queryKey.slice(0, -1), {}]
    expect(options.queryKeyHashFn(options.queryKey)).not.toBe(
      options.queryKeyHashFn(emptyPayloadKey),
    )
  })
})
