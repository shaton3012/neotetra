import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 以下の行を追加してください。これでCSSやJSの読み込み先が正しくなります。
  base: '/neotetra/',
})
