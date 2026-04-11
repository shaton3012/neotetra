import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // これが追加されているか確認

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ここに追加
  ],
  base: '/neotetra/',
})
