<script setup lang="ts">
// Plain CSS column chart for 30 daily values; hover/focus a column for its exact value.
const props = defineProps<{ title: string, data: { day: string, count: number }[], format?: (n: number) => string, summary?: string }>()
const max = computed(() => Math.max(1, ...props.data.map(d => d.count)))
const fmt = (n: number) => (props.format ?? formatNumber)(n)
const total = computed(() => props.data.reduce((sum, d) => sum + d.count, 0))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="font-medium">{{ title }}</h3>
        <span class="text-sm text-muted tabular-nums">{{ summary ?? `${fmt(total)} in 30 days` }}</span>
      </div>
    </template>
    <div class="flex items-end gap-0.5 h-32" role="img" :aria-label="`${title}: ${summary ?? `${fmt(total)} over the last 30 days`}`">
      <UTooltip v-for="d in data" :key="d.day" :text="`${formatDate(d.day)}: ${fmt(d.count)}`">
        <div class="flex-1 h-full flex items-end">
          <div
            class="w-full rounded-t-sm bg-primary/80 hover:bg-primary min-h-px"
            :style="{ height: `${(d.count / max) * 100}%` }"
          />
        </div>
      </UTooltip>
    </div>
    <div class="flex justify-between text-xs text-dimmed mt-2">
      <span>{{ formatDate(data[0]?.day) }}</span>
      <span>Today</span>
    </div>
  </UCard>
</template>
