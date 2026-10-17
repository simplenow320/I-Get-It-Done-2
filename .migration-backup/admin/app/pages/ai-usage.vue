<script setup lang="ts">
const { data, error, refresh, status } = await useFetch('/api/ai-usage')
const costDaily = computed(() => data.value?.daily.map(d => ({ day: d.day, count: d.cost })) ?? [])
const requestsDaily = computed(() => data.value?.daily.map(d => ({ day: d.day, count: d.requests })) ?? [])
const monthCost = computed(() => data.value?.byFeature.reduce((s, f) => s + f.cost, 0) ?? 0)
const monthRequests = computed(() => data.value?.byFeature.reduce((s, f) => s + f.requests, 0) ?? 0)
const FEATURES: Record<string, string> = { transcribe: 'Voice transcription', extract: 'Task extraction' }

function units(f: FeatureUsage) {
  return f.provider === 'deepgram'
    ? `${formatNumber(Math.round(f.audio_seconds / 60))} audio min`
    : `${formatNumber(f.input_tokens)} in / ${formatNumber(f.output_tokens)} out tokens`
}
</script>

<template>
  <UDashboardPanel id="ai-usage">
    <template #header>
      <UDashboardNavbar title="AI usage">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" aria-label="Refresh" :loading="status === 'pending'" @click="refresh()" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load AI usage" :description="error.statusMessage" />
      <template v-else-if="data">
        <p class="text-sm text-muted">
          Every OpenAI and Deepgram request the server makes, priced at OpenAI ${{ data.rates.openaiPer1mInput }} / ${{ data.rates.openaiPer1mOutput }} per 1M input / output tokens and Deepgram ${{ data.rates.deepgramPerMinute }} per audio minute.
          <template v-if="data.trackingSince">Tracking since {{ formatDateTime(data.trackingSince) }}.</template>
          <template v-else>No requests recorded yet. Tracking starts when the server update is deployed.</template>
        </p>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          <StatTile label="AI cost this month" icon="i-lucide-receipt" :value="formatUsd(monthCost)" />
          <StatTile label="Requests this month" icon="i-lucide-activity" :value="formatNumber(monthRequests)" />
          <StatTile label="Cost per request" icon="i-lucide-divide" :value="monthRequests ? formatUsd(monthCost / monthRequests) : '—'" hint="This month" />
          <StatTile label="Users using AI" icon="i-lucide-users" :value="formatNumber(data.topUsers.length)" :hint="data.topUsers.length === 25 ? 'Top 25 shown below' : 'This month'" />
        </div>

        <div class="grid lg:grid-cols-2 gap-4 mt-4">
          <DailyBars title="AI cost per day" :data="costDaily" :format="formatUsd" />
          <DailyBars title="AI requests per day" :data="requestsDaily" />
        </div>

        <div class="grid lg:grid-cols-2 gap-4 mt-4">
          <UCard>
            <template #header><h3 class="font-medium">By feature this month</h3></template>
            <table v-if="data.byFeature.length" class="w-full text-sm tabular-nums">
              <thead><tr class="text-left text-muted"><th class="font-normal py-1">Feature</th><th class="font-normal text-right">Requests</th><th class="font-normal text-right">Usage</th><th class="font-normal text-right">Cost</th></tr></thead>
              <tbody>
                <tr v-for="f in data.byFeature" :key="f.provider + f.model + f.feature" class="border-t border-default">
                  <td class="py-1.5">{{ FEATURES[f.feature] ?? f.feature }} <div class="text-xs text-dimmed">{{ f.provider }} · {{ f.model }}</div></td>
                  <td class="text-right">{{ formatNumber(f.requests) }}</td>
                  <td class="text-right text-muted">{{ units(f) }}</td>
                  <td class="text-right font-medium">{{ formatUsd(f.cost) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted">No AI requests this month.</p>
          </UCard>
          <UCard>
            <template #header><h3 class="font-medium">Top users by cost this month</h3></template>
            <table v-if="data.topUsers.length" class="w-full text-sm tabular-nums">
              <thead><tr class="text-left text-muted"><th class="font-normal py-1">User</th><th class="font-normal">Plan</th><th class="font-normal text-right">Requests</th><th class="font-normal text-right">Cost</th></tr></thead>
              <tbody>
                <tr v-for="u in data.topUsers" :key="u.id" class="border-t border-default">
                  <td class="py-1.5"><NuxtLink :to="`/users/${u.id}`" class="hover:text-primary">{{ u.email }}</NuxtLink></td>
                  <td><UBadge :color="STATUS_COLORS[u.subscription_status] ?? 'neutral'" variant="subtle" :label="u.subscription_status" /></td>
                  <td class="text-right">{{ formatNumber(u.requests) }}</td>
                  <td class="text-right">{{ formatUsd(u.cost) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted">No AI requests this month.</p>
          </UCard>
        </div>

        <div class="mt-4">
          <DailyBars title="Voice minutes (daily quota counter)" :data="data.voiceDaily" :format="formatMinutes" />
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
