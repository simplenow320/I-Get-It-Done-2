<script setup lang="ts">
defineProps<{ title: string, description?: string, rows: SubscriberRow[], empty: string, show?: 'trial' | 'tasks' | 'active' }>()
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-medium">{{ title }} <span class="text-muted font-normal tabular-nums">({{ rows.length }})</span></h3>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </template>
    <ul v-if="rows.length" class="divide-y divide-default text-sm max-h-80 overflow-y-auto">
      <li v-for="u in rows" :key="u.id" class="flex items-center justify-between gap-3 py-2">
        <NuxtLink :to="`/users/${u.id}`" class="min-w-0 truncate hover:text-primary">{{ u.email ?? u.id }}</NuxtLink>
        <span class="shrink-0 text-muted tabular-nums">
          <template v-if="show === 'trial'">{{ u.trial_ends_at ? `ends ${formatDateTime(u.trial_ends_at)}` : 'no end date' }}</template>
          <template v-else-if="show === 'tasks'">{{ u.lifetime_tasks_created }} tasks</template>
          <template v-else>active {{ formatDate(u.last_active_date) }}</template>
        </span>
      </li>
    </ul>
    <p v-else class="text-sm text-muted">{{ empty }}</p>
  </UCard>
</template>
