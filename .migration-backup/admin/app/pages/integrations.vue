<script setup lang="ts">
const { data, error } = await useFetch('/api/integrations')
</script>

<template>
  <UDashboardPanel id="integrations">
    <template #header>
      <UDashboardNavbar title="Integrations">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load integrations" :description="error.statusMessage" />
      <template v-else-if="data">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Active connector keys" icon="i-lucide-key-round" :value="formatNumber(data.totals.active_keys)" />
          <StatTile label="Keys used this week" icon="i-lucide-activity" :value="formatNumber(data.totals.keys_used_7d)" />
          <StatTile label="Live OAuth tokens" icon="i-lucide-shield-check" :value="formatNumber(data.totals.live_oauth_tokens)" />
          <StatTile label="Users with OAuth" icon="i-lucide-users" :value="formatNumber(data.totals.oauth_users)" />
        </div>
        <div class="grid lg:grid-cols-2 gap-4 mt-4">
          <UCard>
            <template #header><h3 class="font-medium">OAuth clients</h3></template>
            <table v-if="data.clients.length" class="w-full text-sm">
              <thead><tr class="text-left text-muted"><th class="font-normal py-1">Client</th><th class="font-normal">Active tokens</th><th class="font-normal">Last used</th></tr></thead>
              <tbody>
                <tr v-for="c in data.clients" :key="c.id" class="border-t border-default">
                  <td class="py-1.5">{{ c.client_name || c.id }}</td><td class="tabular-nums">{{ c.active_tokens }}</td><td>{{ formatDate(c.last_used_at) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted">No OAuth clients registered.</p>
          </UCard>
          <UCard>
            <template #header><h3 class="font-medium">Recent connector keys</h3></template>
            <table v-if="data.recentKeys.length" class="w-full text-sm">
              <thead><tr class="text-left text-muted"><th class="font-normal py-1">User</th><th class="font-normal">Key</th><th class="font-normal">Last used</th></tr></thead>
              <tbody>
                <tr v-for="k in data.recentKeys" :key="k.id" class="border-t border-default" :class="{ 'text-dimmed': k.revoked_at }">
                  <td class="py-1.5"><NuxtLink :to="`/users/${k.user_id}`" class="hover:text-primary">{{ k.email }}</NuxtLink></td>
                  <td class="font-mono">{{ k.key_prefix }}… <span v-if="k.revoked_at" class="font-sans">(revoked)</span></td>
                  <td>{{ formatDate(k.last_used_at) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted">No connector keys yet.</p>
          </UCard>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
