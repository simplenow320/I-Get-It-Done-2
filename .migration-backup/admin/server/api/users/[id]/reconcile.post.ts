export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  try {
    const check = await checkUser(id)
    const changed = await applyCheck(event, check)
    return { changed, status: check.expected.status, reason: check.expected.reason }
  } catch (err) {
    revenueCatError(err)
  }
})
