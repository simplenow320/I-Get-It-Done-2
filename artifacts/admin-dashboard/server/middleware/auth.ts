// Every admin API route requires an admin session except signing in.
export default defineEventHandler(async (event) => {
  // Nitro may expose either the mounted URL or the base-stripped URL.
  const path = getRequestURL(event).pathname.replace(/^\/admin(?=\/)/, '')
  if (!path.startsWith('/api/') || path === '/api/auth/login' || path === '/api/auth/logout') return
  event.context.admin = await requireAdmin(event)
})
