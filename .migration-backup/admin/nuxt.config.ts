export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // Internal tool: no SEO need, and client rendering keeps dates in the admin's own timezone.
  ssr: false,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  vite: {
    server: {
      allowedHosts: process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []
    }
  },
  // Server-only. Set via NUXT_DATABASE_URL, NUXT_SESSION_PASSWORD, NUXT_ADMIN_EMAILS.
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    sessionPassword: '',
    adminEmails: '',
    // Optional finance sources. RevenueCat: a v2 secret key with charts_metrics read permissions.
    revenuecatSecretKey: '',
    revenuecatProjectId: '',
    // Overridable so tests can point at a local stub.
    revenuecatApiUrl: 'https://api.revenuecat.com/v2',
    // Deepgram: a key allowed to read billing (owner/admin scope). Falls back to the app's DEEPGRAM_API_KEY.
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
    deepgramUsdPerMinute: 0.0043,
    // OpenAI prices per 1M tokens for the extraction model (gpt-4.1-mini).
    openaiInputUsdPerMillion: 0.4,
    openaiOutputUsdPerMillion: 1.6
  },
  routeRules: {
    '/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY' } }
  }
})
