<script setup lang="ts">
const route = useRoute()
const action = ref(String(route.query.action ?? 'all'))
const admin = ref('')
const target = ref(String(route.query.target ?? ''))
const page = ref(1)
watch([action, admin, target], () => { page.value = 1 })

const query = computed(() => ({ action: action.value === 'all' ? '' : action.value, admin: admin.value, target: target.value, page: page.value }))
const { data, error, status } = await useFetch('/api/audit', { query })
const actionItems = computed(() => ['all', ...(data.value?.actions ?? [])])

const ACTION_COLORS: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  'user.delete': 'error',
  'credentials.revoke': 'warning',
  'auth.login_failed': 'warning',
  'auth.login_locked': 'error',
  'user.update': 'info'
}
</script>

<template>
  <UDashboardPanel id="audit">
    <template #header>
      <UDashboardNavbar title="Audit log">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><span class="text-sm text-muted tabular-nums">{{ formatNumber(data?.total) }} entries</span></template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <USelect v-model="action" :items="actionItems" aria-label="Filter by action" class="w-48" />
        <UInput v-model.lazy="admin" icon="i-lucide-user-cog" placeholder="Admin email" aria-label="Filter by admin" class="w-56" />
        <UInput v-model.lazy="target" icon="i-lucide-user" placeholder="Target user ID" aria-label="Filter by target user" class="w-64" />
      </UDashboardToolbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load the audit log" :description="error.statusMessage" />
      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-muted"><th class="font-normal py-2 pr-3">When</th><th class="font-normal pr-3">Admin</th><th class="font-normal pr-3">Action</th><th class="font-normal pr-3">Target</th><th class="font-normal pr-3">Details</th><th class="font-normal">IP</th></tr></thead>
            <tbody :class="{ 'opacity-60': status === 'pending' }">
              <tr v-for="r in data?.rows" :key="r.id" class="border-t border-default align-top">
                <td class="py-2 pr-3 whitespace-nowrap">{{ formatDateTime(r.created_at) }}</td>
                <td class="pr-3">{{ r.admin_email ?? '—' }}</td>
                <td class="pr-3"><UBadge :color="ACTION_COLORS[r.action] ?? 'neutral'" variant="subtle" :label="r.action" /></td>
                <td class="pr-3">
                  <NuxtLink v-if="r.target_user_id && r.target_email" :to="`/users/${r.target_user_id}`" class="hover:text-primary">{{ r.target_email }}</NuxtLink>
                  <span v-else-if="r.target_user_id" class="font-mono text-xs text-muted" title="User no longer exists">{{ r.target_user_id }}</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="pr-3"><code v-if="r.details && Object.keys(r.details).length" class="text-xs text-muted break-all">{{ JSON.stringify(r.details) }}</code></td>
                <td class="font-mono text-xs text-muted">{{ r.ip ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="data && !data.rows.length" class="py-8 text-center text-muted">No audit entries match these filters.</p>
        <div v-if="data && data.total > data.pageSize" class="flex justify-end pt-4">
          <UPagination v-model:page="page" :total="data.total" :items-per-page="data.pageSize" />
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
