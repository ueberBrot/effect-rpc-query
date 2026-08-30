import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/unstable/rpc'

import {
  createRpcQueryUtils,
  EffectRpcQueryConfigError,
  EffectRpcQueryKeyError,
  type CreateRpcQueryUtilsOptions,
  type JsonValue,
} from '#effect-rpc-query'

import { group, makeClient, makeRpcTestClient } from './fixtures/effect-rpc'

describe('createRpcQueryUtils configuration', () => {
  it.effect('reports invalid utility paths with a stable configuration error', () =>
    Effect.gen(function* () {
      const InvalidPath = Rpc.make('invalid..path', { success: Schema.String })
      const invalidGroup = RpcGroup.make(InvalidPath)
      const client = yield* makeRpcTestClient(invalidGroup, {
        'invalid..path': () => Effect.succeed('ok'),
      })

      expect(() =>
        createRpcQueryUtils(invalidGroup, {
          client,
          keyPrefix: ['app'] as const,
        }),
      ).toThrow(
        expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
          _tag: 'EffectRpcQueryConfigError',
          code: 'InvalidRpcPath',
          rpcTag: 'invalid..path',
        }),
      )
    }),
  )

  it.effect('reports non-JSON encoder output with a stable key error', () =>
    Effect.gen(function* () {
      const client = yield* makeClient()
      const utils = createRpcQueryUtils(group, {
        client,
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
    }),
  )

  it.effect('requires a custom key encoder for explicitly redacted payloads', () =>
    Effect.gen(function* () {
      const Secret = Rpc.make('secrets.read', {
        payload: { secret: Schema.Redacted(Schema.String) },
        success: Schema.String,
      })
      const secretGroup = RpcGroup.make(Secret)
      type SecretOptions = CreateRpcQueryUtilsOptions<typeof secretGroup, readonly ['app']>
      const client = yield* makeRpcTestClient(secretGroup, {
        'secrets.read': () => Effect.succeed('ok'),
      })
      const unsafeOptions = {
        client,
        keyPrefix: ['app'] as const,
      } as unknown as SecretOptions

      expect(() => createRpcQueryUtils(secretGroup, unsafeOptions)).toThrow(
        expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
          _tag: 'EffectRpcQueryConfigError',
          code: 'MissingKeyEncoder',
          rpcTag: 'secrets.read',
        }),
      )
    }),
  )

  it.effect('requires a custom key encoder for Schema encoding middleware', () =>
    Effect.gen(function* () {
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
      type ServicefulOptions = CreateRpcQueryUtilsOptions<typeof servicefulGroup, readonly ['app']>
      const client = yield* makeRpcTestClient(servicefulGroup, {
        'encoding.serviceful': () => Effect.succeed('ok'),
      })
      const unsafeOptions = {
        client,
        keyPrefix: ['app'] as const,
      } as unknown as ServicefulOptions

      expect(() => createRpcQueryUtils(servicefulGroup, unsafeOptions)).toThrow(
        expect.objectContaining<Partial<EffectRpcQueryConfigError>>({
          code: 'MissingKeyEncoder',
          rpcTag: 'encoding.serviceful',
        }),
      )
    }),
  )

  it.effect('preserves an own __proto__ property in canonical payload keys', () =>
    Effect.gen(function* () {
      const encoded = Object.defineProperty({}, '__proto__', {
        enumerable: true,
        value: 'semantic-value',
      }) as JsonValue
      const client = yield* makeClient()
      const utils = createRpcQueryUtils(group, {
        client,
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
    }),
  )
})
