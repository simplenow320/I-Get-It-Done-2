// Fixes the given users by re-checking each against RevenueCat; never trusts statuses from the request.
export default defineEventHandler(async (event) => {
  const { userIds } = await readBody<{ userIds?: unknown }>(event)
  if (!Array.isArray(userIds) || !userIds.length || userIds.length > 400 || !userIds.every(id => typeof id === 'string')) {
    throw createError({ statusCode: 400, statusMessage: 'Send 1 to 400 user IDs' })
  }
  const outcomes = await mapLimit(userIds as string[], 3, async (id) => {
    try {
      return { id, changed: await applyCheck(event, await checkUser(id)) }
    } catch (err: any) {
      if (err instanceof RevenueCatNotConfigured) throw err
      return { id, changed: false, error: err?.statusMessage ?? err?.message ?? 'failed' }
    }
  }).catch(revenueCatError)
  return { fixed: outcomes.filter(o => o.changed).length, failed: outcomes.filter(o => 'error' in o).length, outcomes }
})
