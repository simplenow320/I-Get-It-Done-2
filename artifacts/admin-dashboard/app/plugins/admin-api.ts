// Scope both useFetch and direct $fetch calls to the Nuxt service, never the
// sibling mobile API. Nuxt's router handles the same base for page navigation.
export default defineNuxtPlugin(() => {
  const baseURL = useRuntimeConfig().app.baseURL
  globalThis.$fetch = $fetch.create({
    onRequest({ request, options }) {
      if (typeof request === 'string' && request.startsWith('/api/')) {
        options.baseURL = baseURL
      }
    }
  })
})
