export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  try {
    const check = await checkUser(id)
    const [recorded] = await sql<{ paid: number, proceeds: number }>(
      `SELECT coalesce(sum(b.price_usd), 0)::float AS paid, coalesce(sum(${PROCEEDS_SQL}), 0)::float AS proceeds FROM billing_events b WHERE user_id = $1`, [id])
    return { ...check, recorded: recorded! }
  } catch (err) {
    revenueCatError(err)
  }
})
