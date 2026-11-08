import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    // The public preview is routed through an *.omgithub.com hostname.
    allowedHosts: ['.omgithub.com']
  }
})
