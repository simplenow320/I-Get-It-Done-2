<script setup lang="ts">
const { data, error, refresh, status } = await useFetch('/api/finance')

const rc = computed(() => data.value?.revenuecat)
// RevenueCat reports money metrics with a currency unit ("$" or the currency code); everything else is a count.
const formatMetric = (m: { unit: string, value: number }) => (/^\$|usd/i.test(m.unit) ? formatUsd(m.value) : formatNumber(m.value))
</script>

<template>
  <UDashboardPanel id="finance">
    <template #header>
      <UDashboardNavbar title="Finance">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Refresh" :loading="status === 'pending'" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load finance data" :description="error.statusMessage" />
      <template v-else-if="data && rc">
        <h2 class="font-semibold">Revenue</h2>
        <p class="text-sm text-muted mb-3">From RevenueCat, in USD, updated every few minutes. Proceeds are what you receive after Apple/Google fees and taxes. Store payout balances live in App Store Connect and Google Play Console.</p>

        <UAlert
          v-if="!rc.configured" color="neutral" variant="subtle" icon="i-lucide-plug"
          title="Connect RevenueCat to see revenue"
          description="Set NUXT_REVENUECAT_SECRET_KEY (a v2 secret key with Charts & Metrics read access) and NUXT_REVENUECAT_PROJECT_ID, then restart the admin."
        />
        <template v-else>
          <UAlert v-if="rc.overview?.error" color="error" variant="subtle" title="RevenueCat metrics unavailable" :description="rc.overview.error" class="mb-4" />
          <div v-else-if="rc.overview?.data" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile v-for="m in rc.overview.data.metrics" :key="m.id" :label="m.name" :value="formatMetric(m)" :hint="m.period === 'P28D' ? 'Last 28 days' : 'Right now'" />
          </div>

          <UAlert v-if="rc.revenue?.error" color="error" variant="subtle" title="RevenueCat revenue unavailable" :description="rc.revenue.error" class="mt-4" />
          <UCard v-else-if="rc.revenue?.data" class="mt-4">
            <template #header><h3 class="font-medium">Revenue and proceeds</h3></template>
            <table class="w-full text-sm tabular-nums">
              <thead><tr class="text-left text-muted"><th class="font-normal py-1">Period</th><th class="font-normal text-right">Gross revenue</th><th class="font-normal text-right">Store fees and taxes</th><th class="font-normal text-right">Proceeds</th></tr></thead>
              <tbody>
                <tr v-for="w in rc.revenue.data" :key="w.label" class="border-t border-default">
                  <td class="py-1.5">{{ w.label }} <span class="text-xs text-dimmed">{{ formatDate(w.start) }} – {{ formatDate(w.end) }}</span></td>
                  <td class="text-right">{{ formatUsd(w.revenue) }}</td>
                  <td class="text-right text-muted">{{ formatUsd(w.revenue - w.proceeds) }}</td>
                  <td class="text-right font-medium">{{ formatUsd(w.proceeds) }}</td>
                </tr>
              </tbody>
            </table>
          </UCard>
        </template>

        <h2 class="font-semibold mt-8">Usage vs revenue</h2>
        <p class="text-sm text-muted mb-3">
          From the app's own records: payments arrive through the RevenueCat webhook, and AI costs are priced per request
          (OpenAI ${{ data.rates.openaiPer1mInput }} / ${{ data.rates.openaiPer1mOutput }} per 1M tokens, Deepgram ${{ data.rates.deepgramPerMinute }} per minute).
          <template v-if="data.trackingSince.ai || data.trackingSince.billing">
            Payments recorded since {{ formatDate(data.trackingSince.billing) }}, AI costs since {{ formatDate(data.trackingSince.ai) }}. Earlier activity is not included.
          </template>
          <template v-else>Nothing recorded yet. Tracking starts when the server update is deployed.</template>
        </p>
        <UCard>
          <table class="w-full text-sm tabular-nums">
            <thead>
              <tr class="text-left text-muted">
                <th class="font-normal py-1">Period</th><th class="font-normal text-right">Paid</th><th class="font-normal text-right">Proceeds</th>
                <th class="font-normal text-right">OpenAI</th><th class="font-normal text-right">Deepgram</th><th class="font-normal text-right">AI cost</th><th class="font-normal text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in data.tracked" :key="w.label" class="border-t border-default">
                <td class="py-1.5">{{ w.label }}</td>
                <td class="text-right">{{ formatUsd(w.paid) }}</td>
                <td class="text-right">{{ formatUsd(w.proceeds) }}</td>
                <td class="text-right text-muted">{{ formatUsd(w.openai) }}</td>
                <td class="text-right text-muted">{{ formatUsd(w.deepgram) }}</td>
                <td class="text-right">{{ formatUsd(w.ai_cost) }}</td>
                <td class="text-right font-medium" :class="w.proceeds - w.ai_cost < 0 ? 'text-error' : ''">{{ formatUsd(w.proceeds - w.ai_cost) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="text-xs text-dimmed mt-3">Margin is proceeds minus AI cost. Hosting, email and other fixed costs are not included.</p>
        </UCard>

        <GapReport class="mt-4" />

        <h2 class="font-semibold mt-8">Vendor balances</h2>
        <UCard class="mt-3">
          <template #header><h3 class="font-medium">Deepgram balance</h3></template>
          <p v-if="!data.deepgram.configured" class="text-sm text-muted">Set NUXT_DEEPGRAM_API_KEY (or DEEPGRAM_API_KEY) to a key that can read billing.</p>
          <UAlert v-else-if="data.deepgram.balances?.error" color="error" variant="subtle" :description="data.deepgram.balances.error" />
          <ul v-else class="space-y-2">
            <li v-for="p in data.deepgram.balances?.data" :key="p.project" class="flex justify-between text-sm">
              <span>{{ p.project }}</span>
              <span class="tabular-nums font-medium">
                <template v-if="p.balances.length">{{ p.balances.map(b => b.units === 'USD' ? formatUsd(b.amount) : `${formatNumber(b.amount)} ${b.units}`).join(', ') }}</template>
                <template v-else>No prepaid balance</template>
              </span>
            </li>
          </ul>
          <p class="text-xs text-dimmed mt-3">OpenAI balance needs an organization admin key and is not shown.</p>
        </UCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
