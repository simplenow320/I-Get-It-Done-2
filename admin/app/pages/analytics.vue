<script setup lang="ts">
const { data, error, refresh, status } = await useFetch('/api/analytics')

const funnelSteps = computed(() => data.value && [
  { label: 'Signed up', value: data.value.funnel.signed_up },
  { label: 'Created a first task', value: data.value.funnel.first_task },
  { label: 'Used the free Pro trial (10 tasks)', value: data.value.funnel.trial_used },
  { label: 'Paying', value: data.value.funnel.paying }
])
const features = computed(() => data.value && [
  { label: 'Created tasks', value: data.value.adoption.tasks },
  { label: 'Break It Down (subtasks)', value: data.value.adoption.subtasks },
  { label: 'Focus timer', value: data.value.adoption.focus },
  { label: 'Voice capture', value: data.value.adoption.voice },
  { label: 'Delegation', value: data.value.adoption.delegation },
  { label: 'Team', value: data.value.adoption.team },
  { label: 'AI connector (MCP)', value: data.value.adoption.ai_connector },
  { label: 'Push notifications', value: data.value.adoption.push }
])
const openTasks = computed(() => data.value?.lanes.reduce((s, l) => s + l.count, 0) ?? 0)
</script>

<template>
  <UDashboardPanel id="analytics">
    <template #header>
      <UDashboardNavbar title="Analytics">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Refresh" :loading="status === 'pending'" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load analytics" :description="error.statusMessage" />
      <template v-else-if="data">
        <p class="text-sm text-muted">Active means created or completed a task. Live now also counts voice capture and AI connector use.</p>
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-3">
          <StatTile label="Live now" icon="i-lucide-radio" :value="formatNumber(data.actives.live_15m)" hint="Active in the last 15 minutes" />
          <StatTile label="Daily active" icon="i-lucide-sun" :value="formatNumber(data.actives.dau)" hint="Last 24 hours" />
          <StatTile label="Weekly active" icon="i-lucide-calendar-days" :value="formatNumber(data.actives.wau)" hint="Last 7 days" />
          <StatTile label="Monthly active" icon="i-lucide-calendar" :value="formatNumber(data.actives.mau)" hint="Last 30 days" />
          <StatTile label="Stickiness" icon="i-lucide-magnet" :value="percent(data.actives.dau, data.actives.mau)" hint="Daily ÷ monthly active" />
        </div>

        <div class="mt-4">
          <DailyBars title="Weekly active users" :data="data.weekly" summary="Last 12 weeks, by week starting" />
        </div>

        <UCard class="mt-4">
          <template #header>
            <h3 class="font-medium">Retention by sign-up week</h3>
            <p class="text-sm text-muted">Share of each week's sign-ups who were active N weeks later.</p>
          </template>
          <div class="overflow-x-auto">
            <table v-if="data.cohorts.length" class="w-full text-sm tabular-nums">
              <thead>
                <tr class="text-left text-muted">
                  <th class="font-normal py-1 pr-3">Week of</th><th class="font-normal pr-3">Users</th>
                  <th v-for="n in 8" :key="n" class="font-normal text-center px-1">W{{ n - 1 }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in data.cohorts" :key="c.week" class="border-t border-default">
                  <td class="py-1 pr-3 whitespace-nowrap">{{ formatDate(c.week) }}</td>
                  <td class="pr-3">{{ c.size }}</td>
                  <td v-for="n in 8" :key="n" class="px-0.5 py-0.5">
                    <div
                      v-if="n - 1 < c.active.length"
                      class="rounded text-center py-1 text-xs"
                      :class="c.size && c.active[n - 1]! / c.size > 0.5 ? 'text-inverted' : ''"
                      :style="{ backgroundColor: `color-mix(in oklab, var(--ui-primary) ${c.size ? Math.round((c.active[n - 1]! / c.size) * 100) : 0}%, transparent)` }"
                      :title="`${c.active[n - 1]} of ${c.size}`"
                    >
                      {{ percent(c.active[n - 1]!, c.size) }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted">No sign-ups in the last 8 weeks.</p>
          </div>
        </UCard>

        <div class="grid lg:grid-cols-3 gap-4 mt-4">
          <UCard>
            <template #header><h3 class="font-medium">Conversion funnel</h3></template>
            <div class="space-y-3">
              <ShareBar v-for="s in funnelSteps" :key="s.label" :label="s.label" :value="s.value" :total="data.funnel.signed_up" />
            </div>
          </UCard>
          <UCard>
            <template #header><h3 class="font-medium">Feature adoption</h3></template>
            <div class="space-y-3">
              <ShareBar v-for="f in features" :key="f.label" :label="f.label" :value="f.value" :total="data.adoption.users" />
            </div>
          </UCard>
          <UCard>
            <template #header><h3 class="font-medium">Open tasks by lane</h3></template>
            <div v-if="data.lanes.length" class="space-y-3">
              <ShareBar v-for="l in data.lanes" :key="l.lane" :label="l.lane.charAt(0).toUpperCase() + l.lane.slice(1)" :value="l.count" :total="openTasks" />
            </div>
            <p v-else class="text-sm text-muted">No open tasks.</p>
          </UCard>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
