import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss({
            // 🌟 KUNCI FIX INSTAN: Memaksa compiler Tailwind v4 membaca class murni dari injeksi text string
            content: {
                inline: '@variant dark (&:where(.dark, .dark *));'
            }
        }) // Kita gunakan bypass 'as any' agar linter TypeScript diam
    ],
});
