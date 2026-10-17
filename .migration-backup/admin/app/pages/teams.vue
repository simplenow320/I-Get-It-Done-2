<script setup lang="ts">
const { data, error } = await useFetch('/api/teams')
</script>

<template>
  <UDashboardPanel id="teams">
    <template #header>
      <UDashboardNavbar title="Teams">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load teams" :description="error.statusMessage" />
      <template v-else-if="data">
        <div class="grid sm:grid-cols-3 gap-4">
          <StatTile label="Team links" icon="i-lucide-link" :value="formatNumber(data.links)" hint="One per direction, so two per pair" />
          <UCard>
            <h3 class="text-sm text-muted mb-2">Invites</h3>
            <ul class="text-sm space-y-1">
              <li v-for="i in data.invites" :key="i.status" class="flex justify-between"><span class="capitalize">{{ i.status }}</span><span class="tabular-nums">{{ i.count }}</span></li>
              <li v-if="!data.invites.length" class="text-muted">No invites yet.</li>
            </ul>
          </UCard>
          <UCard>
            <h3 class="text-sm text-muted mb-2">Delegated tasks</h3>
            <ul class="text-sm space-y-1">
              <li v-for="d in data.delegation" :key="d.status" class="flex justify-between"><span class="capitalize">{{ d.status }}</span><span class="tabular-nums">{{ d.count }}</span></li>
              <li v-if="!data.delegation.length" class="text-muted">No delegated tasks yet.</li>
            </ul>
          </UCard>
        </div>
        <UCard class="mt-4">
          <template #header><h3 class="font-medium">Recent invites</h3></template>
          <table v-if="data.recentInvites.length" class="w-full text-sm">
            <thead><tr class="text-left text-muted"><th class="font-normal py-1">Inviter</th><th class="font-normal">Status</th><th class="font-normal">Sent</th><th class="font-normal">Expires</th></tr></thead>
            <tbody>
              <tr v-for="i in data.recentInvites" :key="i.id" class="border-t border-default">
                <td class="py-1.5"><NuxtLink v-if="i.inviter_id" :to="`/users/${i.inviter_id}`" class="hover:text-primary">{{ i.inviter_email }}</NuxtLink></td>
                <td class="capitalize">{{ i.status }}</td>
                <td>{{ formatDate(i.created_at) }}</td>
                <td>{{ formatDate(i.expires_at) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-muted">No invites yet.</p>
        </UCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
