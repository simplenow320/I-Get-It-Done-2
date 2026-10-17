export function useAdmin() {
  const admin = useState<{ email: string } | null>('admin', () => null)

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    admin.value = null
    await navigateTo('/login')
  }

  return { admin, logout }
}
