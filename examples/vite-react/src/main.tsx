import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ViteReactExample } from './App.tsx'
import { startViteReactApplication } from './application.ts'

import './styles.css'

const rpcUrl = import.meta.env.VITE_RPC_URL ?? '/rpc'
const container = document.querySelector('#root')

if (container === null) {
  throw new Error('The Vite React root element is missing')
}

const application = await startViteReactApplication({ rpcUrl })
const root = createRoot(container)
root.render(
  <StrictMode>
    <ViteReactExample application={application} />
  </StrictMode>,
)

let disposed = false
const dispose = () => {
  if (disposed) return
  disposed = true
  root.unmount()
  void application.dispose()
}

globalThis.addEventListener('pagehide', dispose, { once: true })
if (import.meta.hot !== undefined) import.meta.hot.dispose(dispose)
