<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { admin, logout } = useAdmin()

const items: NavigationMenuItem[] = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Analytics', icon: 'i-lucide-chart-line', to: '/analytics' },
  { label: 'Users', icon: 'i-lucide-users', to: '/users' },
  { label: 'Subscriptions', icon: 'i-lucide-credit-card', to: '/subscriptions' },
  { label: 'Finance', icon: 'i-lucide-wallet', to: '/finance' },
  { label: 'Teams', icon: 'i-lucide-handshake', to: '/teams' },
  { label: 'Integrations', icon: 'i-lucide-plug', to: '/integrations' },
  { label: 'AI usage', icon: 'i-lucide-sparkles', to: '/ai-usage' },
  { label: 'Audit log', icon: 'i-lucide-scroll-text', to: '/audit' }
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <span v-if="!collapsed" class="font-semibold tracking-tight">I GET IT DONE <span class="text-muted font-normal">Admin</span></span>
        <UIcon v-else name="i-lucide-check-check" class="size-5 text-primary mx-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :items="items" :collapsed="collapsed" orientation="vertical" />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex items-center gap-2 w-full min-w-0">
          <span v-if="!collapsed" class="text-sm text-muted truncate flex-1">{{ admin?.email }}</span>
          <UTooltip text="Sign out">
            <UButton icon="i-lucide-log-out" color="neutral" variant="ghost" aria-label="Sign out" @click="logout" />
          </UTooltip>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
