import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub PagesのURL階層に合わせるための設定
  base: '/neotetra/',
})
