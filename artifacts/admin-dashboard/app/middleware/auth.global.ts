// UX only: the real access check is server/middleware/auth.ts.
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.public) return
  const { admin } = useAdmin()
  if (!admin.value) {
    admin.value = await $fetch('/api/auth/me').catch(() => null)
  }
  if (!admin.value && to.path !== '/login') return navigateTo('/login')
  if (admin.value && to.path === '/login') return navigateTo('/')
})
