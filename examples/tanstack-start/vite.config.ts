import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rpcProxy = {
  '/rpc': 'http://127.0.0.1:3001',
}

export default defineConfig({
  plugins: [tanstackStart(), tailwindcss(), react()],
  preview: {
    host: '127.0.0.1',
    port: 3000,
    proxy: rpcProxy,
    strictPort: true,
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: rpcProxy,
    strictPort: true,
  },
})
