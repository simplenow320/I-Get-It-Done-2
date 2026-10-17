// Every admin API route requires an admin session except signing in.
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || path === '/api/auth/login' || path === '/api/auth/logout') return
  event.context.admin = await requireAdmin(event)
})
