import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // これがGitHub Pagesで正しく表示させるための鍵です
  base: '/neotetra/',
})
