export default defineEventHandler(event => ({ email: event.context.admin.email as string }))
