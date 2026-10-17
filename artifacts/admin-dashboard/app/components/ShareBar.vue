<script setup lang="ts">
defineProps<{ label: string, value: number, total: number }>()
</script>

<template>
  <div>
    <div class="flex justify-between text-sm">
      <span>{{ label }}</span>
      <span class="tabular-nums text-muted">{{ formatNumber(value) }} · {{ percent(value, total) }}</span>
    </div>
    <div class="h-2 mt-1 rounded-full bg-elevated overflow-hidden" role="presentation">
      <div class="h-full bg-primary rounded-full" :style="{ width: total ? `${(value / total) * 100}%` : '0%' }" />
    </div>
  </div>
</template>
