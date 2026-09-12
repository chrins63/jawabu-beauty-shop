import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function fullReloadOnScriptChange() {
  return {
    name: 'full-reload-on-script-change',
    handleHotUpdate({ file, server }) {
      if (!/\.(jsx?|tsx?)$/.test(file.replace(/\\/g, '/'))) {
        return
      }

      server.ws.send({ type: 'full-reload', path: '*' })
      return []
    },
  }
}

export default defineConfig({
  plugins: [react(), fullReloadOnScriptChange()],
  base: './',
})
