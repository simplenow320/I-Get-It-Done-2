<script setup lang="ts">
const days = ref(30)
const losing = ref(false)
const page = ref(1)
watch([days, losing], () => { page.value = 1 })
const query = computed(() => ({ days: days.value, losing: losing.value ? '1' : '', page: page.value }))
const { data, error, status } = await useFetch('/api/finance/gaps', { query })
const dayItems = [{ label: 'Last 7 days', value: 7 }, { label: 'Last 30 days', value: 30 }, { label: 'Last 90 days', value: 90 }, { label: 'Last year', value: 365 }]
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-medium">Usage vs paid, by user</h3>
          <p class="text-sm text-muted">AI cost each user caused against what they paid in the same period. Worst margin first.</p>
        </div>
        <div class="flex items-center gap-3">
          <USwitch v-model="losing" label="Losing money only" />
          <USelect v-model="days" :items="dayItems" aria-label="Period" class="w-36" />
        </div>
      </div>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" title="Could not load the gap report" :description="error.statusMessage" />
    <template v-else-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatTile label="Users costing more than they pay" :value="`${formatNumber(data.summary.losing)} of ${formatNumber(data.summary.users)}`" />
        <StatTile label="AI cost from non-paying users" :value="formatUsd(data.summary.unpaid_ai_cost)" />
        <StatTile label="Total AI cost" :value="formatUsd(data.summary.ai_cost)" />
        <StatTile label="Total proceeds" :value="formatUsd(data.summary.proceeds)" :hint="`${formatUsd(data.summary.paid)} paid`" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm tabular-nums" :class="{ 'opacity-60': status === 'pending' }">
          <thead>
            <tr class="text-left text-muted">
              <th class="font-normal py-1">User</th><th class="font-normal">Plan</th><th class="font-normal text-right">AI requests</th>
              <th class="font-normal text-right">AI cost</th><th class="font-normal text-right">Paid</th><th class="font-normal text-right">Proceeds</th><th class="font-normal text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.rows" :key="r.id" class="border-t border-default">
              <td class="py-1.5"><NuxtLink :to="`/users/${r.id}`" class="hover:text-primary">{{ r.email ?? r.id }}</NuxtLink></td>
              <td><UBadge :color="STATUS_COLORS[r.subscription_status] ?? 'neutral'" variant="subtle" :label="r.subscription_status" /></td>
              <td class="text-right">{{ formatNumber(r.requests) }}</td>
              <td class="text-right">{{ formatUsd(r.ai_cost) }}</td>
              <td class="text-right">{{ formatUsd(r.paid) }}</td>
              <td class="text-right">{{ formatUsd(r.proceeds) }}</td>
              <td class="text-right font-medium" :class="r.margin < 0 ? 'text-error' : ''">{{ formatUsd(r.margin) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!data.rows.length" class="py-6 text-center text-sm text-muted">
        {{ losing ? 'Nobody cost more than they paid in this period.' : 'No AI usage or payments recorded in this period.' }}
      </p>
      <div v-if="data.total > data.pageSize" class="flex justify-end pt-4">
        <UPagination v-model:page="page" :total="data.total" :items-per-page="data.pageSize" />
      </div>
    </template>
  </UCard>
</template>
