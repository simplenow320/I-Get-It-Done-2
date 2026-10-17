const STATUSES = ['none', 'trialing', 'active', 'pro', 'past_due']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody<Record<string, unknown>>(event)
  const sets: string[] = []
  const params: unknown[] = []
  const set = (column: string, value: unknown) => {
    params.push(value)
    sets.push(`${column} = $${params.length}`)
  }

  if ('subscriptionStatus' in body) {
    if (!STATUSES.includes(body.subscriptionStatus as string)) throw createError({ statusCode: 400, statusMessage: 'Unknown subscription status' })
    set('subscription_status', body.subscriptionStatus)
  }
  if ('trialEndsAt' in body) {
    const value = body.trialEndsAt === null || body.trialEndsAt === '' ? null : new Date(body.trialEndsAt as string)
    if (value && Number.isNaN(value.getTime())) throw createError({ statusCode: 400, statusMessage: 'Trial end date is not a valid date' })
    set('trial_ends_at', value?.toISOString() ?? null)
  }
  if ('lifetimeTasksCreated' in body) {
    const n = Number(body.lifetimeTasksCreated)
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw createError({ statusCode: 400, statusMessage: 'Lifetime task count must be a whole number of 0 or more' })
    set('lifetime_tasks_created', n)
  }
  if (!sets.length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })

  params.push(id)
  const [user] = await sql(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`, params)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  await audit(event, 'user.update', { targetUserId: id, changes: body })
  return { ok: true }
})
