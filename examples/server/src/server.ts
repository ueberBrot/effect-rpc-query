import { exampleRpcGroup } from '@effect-rpc-query/contracts'
import { Effect, Layer, Schema, Scope } from 'effect'
import { HttpEffect, HttpMiddleware, HttpServerRequest } from 'effect/unstable/http'
import { RpcSerialization, RpcServer } from 'effect/unstable/rpc'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'

import { acquireNodeServer, closeNodeServer } from './node-server-resource.ts'
import { exampleRpcHandlersLayer } from './rpc-handlers.ts'

class ExampleRpcServerError extends Schema.TaggedError<ExampleRpcServerError>()(
  'ExampleRpcServerError',
  {
    cause: Schema.Defect(),
    message: Schema.String,
  },
) {}

const rpcLayer = Layer.mergeAll(exampleRpcHandlersLayer, RpcSerialization.layerJson)

const nodeHeaders = (request: IncomingMessage): Headers => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(name, entry)
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }
  return headers
}

const toWebRequest = (
  request: IncomingMessage,
  response: ServerResponse,
  origin: string,
): Request => {
  const controller = new AbortController()
  request.once('aborted', () => controller.abort())
  request.once('close', () => {
    if (!request.complete) controller.abort()
  })
  response.once('close', () => {
    if (!response.writableFinished) controller.abort()
  })

  const method = request.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'
  return new Request(new URL(request.url ?? '/', origin), {
    body: hasBody ? (Readable.toWeb(request) as ReadableStream) : undefined,
    duplex: hasBody ? 'half' : undefined,
    headers: nodeHeaders(request),
    method,
    signal: controller.signal,
  } as RequestInit)
}

const writeWebResponse = async (response: Response, target: ServerResponse): Promise<void> => {
  target.statusCode = response.status
  response.headers.forEach((value, name) => target.setHeader(name, value))
  if (response.body === null) {
    target.end()
    return
  }

  await new Promise<void>((resolve, reject) => {
    const body = Readable.fromWeb(response.body as never)
    body.once('error', reject)
    target.once('error', reject)
    target.once('finish', resolve)
    body.pipe(target)
  })
}

const setCorsHeaders = (response: ServerResponse): void => {
  response.setHeader(
    'access-control-allow-headers',
    'baggage,content-type,traceparent,tracestate,x-example-authorization',
  )
  response.setHeader('access-control-allow-methods', 'POST,OPTIONS')
  response.setHeader('access-control-allow-origin', '*')
}

export interface RunningExampleRpcServer {
  readonly host: string
  readonly port: number
  readonly rpcUrl: string
  readonly url: string
}

export interface StartExampleRpcServerOptions {
  readonly host?: string
  readonly port?: number
}

/** Starts the standalone example server and closes it with the caller's Scope. */
export const startExampleRpcServer = Effect.fn('ExampleRpc.startExampleRpcServer')(function* (
  options: StartExampleRpcServerOptions = {},
) {
  const host = options.host ?? '127.0.0.1'
  const scope = yield* Scope.Scope
  const rpcContext = yield* Layer.buildWithScope(rpcLayer, scope)
  const rpcHttpEffect = yield* RpcServer.toHttpEffect(exampleRpcGroup).pipe(
    Effect.provide(rpcContext),
    Scope.provide(scope),
  )
  const runtimeContext = yield* Effect.context<Scope.Scope>()
  const webHandler = HttpEffect.toWebHandlerWith<
    Scope.Scope,
    Scope.Scope | HttpServerRequest.HttpServerRequest
  >(runtimeContext)(HttpMiddleware.logger(rpcHttpEffect))
  const server = createServer((request, response) => {
    const address = server.address()
    const port = typeof address === 'object' && address !== null ? address.port : 0
    const origin = `http://${host}:${String(port)}`
    const path = new URL(request.url ?? '/', origin).pathname
    const isRpcPath = path === '/rpc' || path === '/rpc/'

    if (request.method === 'GET' && path === '/health') {
      response.statusCode = 200
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ status: 'ready' }))
      return
    }

    if (request.method === 'OPTIONS' && isRpcPath) {
      setCorsHeaders(response)
      response.statusCode = 204
      response.end()
      return
    }

    if (request.method !== 'POST' || !isRpcPath) {
      response.statusCode = 404
      response.end()
      return
    }

    setCorsHeaders(response)
    void webHandler(toWebRequest(request, response, origin))
      .then((webResponse) => writeWebResponse(webResponse, response))
      .catch((cause: unknown) => {
        console.error(cause)
        if (!response.headersSent) response.statusCode = 500
        response.end()
      })
  })

  const port = yield* acquireNodeServer(
    server,
    Effect.callback<number, ExampleRpcServerError>((resume) => {
      const onError = (cause: Error) =>
        resume(
          Effect.fail(
            new ExampleRpcServerError({
              cause,
              message: 'Example RPC server failed to listen',
            }),
          ),
        )
      server.once('error', onError)
      server.listen(options.port ?? 0, host, () => {
        server.off('error', onError)
        const address = server.address()
        if (address === null || typeof address === 'string') {
          resume(
            Effect.promise(() => closeNodeServer(server)).pipe(
              Effect.andThen(
                Effect.fail(
                  new ExampleRpcServerError({
                    cause: address,
                    message: 'Example RPC server did not bind a TCP address',
                  }),
                ),
              ),
            ),
          )
          return
        }
        resume(Effect.succeed(address.port))
      })
    }),
  )

  const url = `http://${host}:${String(port)}`
  return {
    host,
    port,
    rpcUrl: `${url}/rpc`,
    url,
  } satisfies RunningExampleRpcServer
})
