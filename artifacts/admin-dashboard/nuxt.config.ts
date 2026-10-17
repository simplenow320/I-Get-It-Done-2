export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // The dashboard renders client-side only (dates stay in the admin's own timezone, see routeRules);
  // SSR stays on so the public landing page can be prerendered to real HTML.
  ssr: true,
  app: { baseURL: '/admin/' },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  vite: {
    server: {
      // Replit's preview proxy can use several hosts, including test sessions.
      allowedHosts: true
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
    // Public marketing page, served at the site root by the mobile app's server/serve.js.
    '/landing': { ssr: true, prerender: true, headers: { 'X-Robots-Tag': 'index, follow' } },
    '/**': { ssr: false, headers: {
      'X-Robots-Tag': 'noindex, nofollow',
      ...(process.env.NODE_ENV === 'production' && process.env.ADMIN_PREVIEW_BUILD !== '1'
        ? { 'X-Frame-Options': 'DENY' }
        : { 'Content-Security-Policy': "frame-ancestors 'self' https://replit.com https://*.replit.com" })
    } }
  }
})
