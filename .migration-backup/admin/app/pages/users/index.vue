<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')
const route = useRoute()
const router = useRouter()

const q = ref(String(route.query.q ?? ''))
const status = ref(String(route.query.status ?? 'all'))
const page = ref(Number(route.query.page ?? 1))
const debouncedQ = ref(q.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => { debouncedQ.value = v }, 300)
})

const query = computed(() => ({ q: debouncedQ.value, status: status.value === 'all' ? '' : status.value, page: page.value }))
watch([debouncedQ, status], () => { page.value = 1 })
watch(query, v => router.replace({ query: { ...(v.q && { q: v.q }), ...(v.status && { status: v.status }), ...(v.page > 1 && { page: v.page }) } }))

const { data, error, status: loadStatus } = await useFetch('/api/users', { query })

const statusItems = ['all', 'none', 'trialing', 'active', 'pro', 'past_due']

type Row = NonNullable<typeof data.value>['rows'][number]
const columns: TableColumn<Row>[] = [
  {
    accessorKey: 'email',
    header: 'User',
    cell: ({ row }) => h(NuxtLink, { to: `/users/${row.original.id}`, class: 'block hover:text-primary' }, () => [
      h('div', { class: 'font-medium' }, row.original.email ?? '(no email)'),
      h('div', { class: 'text-xs text-muted' }, row.original.display_name ?? '')
    ])
  },
  {
    accessorKey: 'subscription_status',
    header: 'Plan',
    cell: ({ row }) => h(UBadge, { color: STATUS_COLORS[row.original.subscription_status] ?? 'neutral', variant: 'subtle', label: row.original.subscription_status })
  },
  { accessorKey: 'task_count', header: 'Tasks', meta: { class: { td: 'tabular-nums' } } },
  { accessorKey: 'lifetime_tasks_created', header: 'Lifetime', meta: { class: { td: 'tabular-nums' } } },
  { accessorKey: 'current_streak', header: 'Streak', cell: ({ row }) => row.original.current_streak ?? 0 },
  { accessorKey: 'last_active_date', header: 'Last active', cell: ({ row }) => formatDate(row.original.last_active_date) },
  { accessorKey: 'created_at', header: 'Joined', cell: ({ row }) => formatDate(row.original.created_at) }
]
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><span class="text-sm text-muted tabular-nums">{{ formatNumber(data?.total) }} total</span></template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UInput v-model="q" icon="i-lucide-search" placeholder="Email, name or user ID" aria-label="Search users" class="w-full max-w-xs" />
        <USelect v-model="status" :items="statusItems" aria-label="Filter by plan" class="w-36" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load users" :description="error.statusMessage" />
      <UTable v-else :data="data?.rows ?? []" :columns="columns" :loading="loadStatus === 'pending'" class="shrink-0">
        <template #empty>
          <div class="py-8 text-center text-muted">
            No users match these filters.
            <UButton v-if="q || status !== 'all'" variant="link" label="Clear filters" @click="q = ''; status = 'all'" />
          </div>
        </template>
      </UTable>
      <div v-if="data && data.total > data.pageSize" class="flex justify-end pt-4">
        <UPagination v-model:page="page" :total="data.total" :items-per-page="data.pageSize" />
      </div>
    </template>
  </UDashboardPanel>
</template>
