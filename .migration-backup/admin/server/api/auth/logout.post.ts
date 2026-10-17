export default defineEventHandler(async (event) => {
  const session = await adminSession(event)
  if (session.data.email) await audit(event, 'auth.logout', { adminEmail: session.data.email })
  await session.clear()
  return { ok: true }
})
