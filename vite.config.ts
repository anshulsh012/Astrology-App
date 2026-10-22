import type { ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const UNREACHABLE_API = {
  detail: 'Cannot reach the server. Check that the backend is running.',
}

function isServerResponse(res: unknown): res is ServerResponse {
  return res !== null && typeof res === 'object' && 'writeHead' in res
}

function writeProxyError(res: unknown) {
  if (!isServerResponse(res) || res.headersSent) return
  res.writeHead(503, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(UNREACHABLE_API))
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['.monkeycode-ai.live'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            writeProxyError(res)
          })
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
