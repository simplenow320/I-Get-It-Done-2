<script setup lang="ts">
const { data, error } = await useFetch('/api/subscriptions')
const f = computed(() => data.value?.funnel)
</script>

<template>
  <UDashboardPanel id="subscriptions">
    <template #header>
      <UDashboardNavbar title="Subscriptions">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UButton to="/finance" variant="ghost" color="neutral" trailing-icon="i-lucide-arrow-right" label="Revenue" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load subscriptions" :description="error.statusMessage" />
      <template v-else-if="data && f">
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatTile label="Paying" icon="i-lucide-badge-check" :value="formatNumber(f.paying)" hint="Status active or pro" />
          <StatTile label="Store trial" icon="i-lucide-hourglass" :value="formatNumber(f.store_trial)" hint="7-day App Store trial, not expired" />
          <StatTile label="Billing issue" icon="i-lucide-triangle-alert" :value="formatNumber(f.past_due)" hint="past_due from RevenueCat" />
          <StatTile label="Free Pro trial" icon="i-lucide-gift" :value="formatNumber(f.free_trial)" :hint="`Under ${data.freeTrialTasks} lifetime tasks`" />
          <StatTile label="Trial used, not paying" icon="i-lucide-target" :value="formatNumber(f.trial_used_not_paying)" hint="Conversion opportunity" />
        </div>

        <UCard class="mt-4">
          <template #header><h3 class="font-medium">By status</h3></template>
          <div class="flex flex-wrap gap-2">
            <UButton v-for="s in data.statuses" :key="s.status" :to="{ path: '/users', query: { status: s.status } }" color="neutral" variant="outline" size="sm">
              <UBadge :color="STATUS_COLORS[s.status] ?? 'neutral'" variant="subtle" :label="s.status" />
              <span class="tabular-nums">{{ formatNumber(s.count) }}</span>
            </UButton>
          </div>
        </UCard>

        <ReconcilePanel class="mt-4" />

        <div class="grid lg:grid-cols-2 gap-4 mt-4">
          <UserList title="Trials ending in 7 days" :rows="data.trialsEnding" show="trial" empty="No store trials end this week." />
          <UserList title="Billing issues" description="Payment failed at the store. Access continues until RevenueCat sends an expiration." :rows="data.pastDue" empty="No billing issues." />
          <UserList :title="`Close to the ${data.freeTrialTasks}-task limit`" description="Free users who are about to lose Pro features." :rows="data.nearLimit" show="tasks" empty="Nobody is close to the limit." />
          <UserList title="Expired trials still marked trialing" description="RevenueCat should have sent an expiration. Check these in RevenueCat or fix the plan on the user page." :rows="data.staleTrials" show="trial" empty="None. Statuses look consistent." />
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
