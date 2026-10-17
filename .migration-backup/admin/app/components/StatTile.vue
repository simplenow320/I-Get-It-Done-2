<script setup lang="ts">
defineProps<{ label: string, value: string | number, hint?: string, icon?: string }>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <div class="flex items-center gap-2 text-sm text-muted">
      <UIcon v-if="icon" :name="icon" class="size-4" />
      {{ label }}
    </div>
    <div class="mt-1 text-2xl font-semibold tabular-nums">{{ value }}</div>
    <div v-if="hint" class="text-xs text-dimmed mt-0.5">{{ hint }}</div>
  </UCard>
</template>
