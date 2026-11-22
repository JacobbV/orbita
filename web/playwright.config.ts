import { defineConfig, devices } from '@playwright/test'
import { supabaseLocal } from './e2e/supabase-local.ts'

// Testes de ponta a ponta contra o Supabase local (npx supabase start).
// O site sobe com a chave pública lida na hora do `supabase status`.
const PORTA = 5173
const { url, anonKey } = supabaseLocal()

export default defineConfig({
  testDir: 'e2e',
  // O banco é um só: os testes rodam um de cada vez.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORTA}/orbita/`,
    locale: 'pt-BR',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORTA} --strictPort`,
    url: `http://127.0.0.1:${PORTA}/orbita/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey },
  },
})
