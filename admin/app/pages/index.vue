<script setup lang="ts">
const { data, error, refresh, status } = await useFetch('/api/stats')
const t = computed(() => data.value?.totals)
</script>

<template>
  <UDashboardPanel id="overview">
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Refresh" :loading="status === 'pending'" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load stats" :description="error.statusMessage" />
      <template v-else-if="t">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Users" icon="i-lucide-users" :value="formatNumber(t.users)" :hint="`+${t.new_users_7d} this week, +${t.new_users_30d} in 30 days`" />
          <StatTile label="Active users" icon="i-lucide-activity" :value="formatNumber(t.active_7d)" :hint="`${t.active_1d} today or yesterday`" />
          <StatTile label="Tasks completed" icon="i-lucide-circle-check" :value="formatNumber(t.tasks_completed)" :hint="`${formatNumber(t.tasks_completed_7d)} this week, ${formatNumber(t.tasks)} created`" />
          <StatTile label="Focus time" icon="i-lucide-timer" :value="`${formatNumber(Math.round(t.focus_minutes / 60))} h`" hint="All users, all time" />
          <StatTile label="Delegated tasks" icon="i-lucide-handshake" :value="formatNumber(t.tasks_delegated)" />
          <StatTile label="Push reachable" icon="i-lucide-bell" :value="formatNumber(t.push_enabled)" hint="Users with a push token or notifications on" />
          <StatTile label="Voice this month" icon="i-lucide-mic" :value="formatMinutes(t.voice_seconds_month)" hint="Deepgram transcription" />
        </div>

        <div class="grid lg:grid-cols-2 gap-4 mt-4">
          <DailyBars title="Sign-ups" :data="data!.signups" />
          <DailyBars title="Tasks completed" :data="data!.completions" />
        </div>

        <UCard class="mt-4">
          <template #header><h3 class="font-medium">Subscriptions</h3></template>
          <ul class="divide-y divide-default">
            <li v-for="s in data!.subscriptions" :key="s.status">
              <NuxtLink :to="{ path: '/users', query: { status: s.status } }" class="flex items-center justify-between py-2 hover:bg-elevated/50 px-2 -mx-2 rounded">
                <UBadge :color="STATUS_COLORS[s.status] ?? 'neutral'" variant="subtle" :label="s.status" />
                <span class="tabular-nums">{{ formatNumber(s.count) }}</span>
              </NuxtLink>
            </li>
          </ul>
        </UCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
