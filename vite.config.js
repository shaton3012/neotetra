import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/neotetra/', // これが重要です
  plugins: [react()],
})