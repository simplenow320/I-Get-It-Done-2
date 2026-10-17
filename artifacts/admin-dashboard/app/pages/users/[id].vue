<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const id = route.params.id as string
const { data, error, refresh } = await useFetch(`/api/users/${id}`)

const plan = reactive({ subscriptionStatus: 'none', trialEndsAt: '', lifetimeTasksCreated: 0 })
watch(() => data.value?.user, (u) => {
  if (!u) return
  plan.subscriptionStatus = u.subscription_status
  plan.trialEndsAt = u.trial_ends_at ? new Date(u.trial_ends_at).toISOString().slice(0, 10) : ''
  plan.lifetimeTasksCreated = u.lifetime_tasks_created ?? 0
}, { immediate: true })

const saving = ref(false)
async function savePlan() {
  saving.value = true
  try {
    await $fetch(`/api/users/${id}`, { method: 'PATCH', body: plan })
    toast.add({ title: 'Plan updated', color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Could not update plan', description: e?.data?.statusMessage ?? 'Try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function revoke(kind: 'connector' | 'oauth', tokenId?: string) {
  try {
    const { revoked } = await $fetch(`/api/users/${id}/revoke`, { method: 'POST', body: { kind, tokenId } })
    toast.add({ title: `Revoked ${revoked} credential${revoked === 1 ? '' : 's'}`, color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Could not revoke', description: e?.data?.statusMessage ?? 'Try again.', color: 'error' })
  }
}

const deleteOpen = ref(false)
const confirmText = ref('')
const deleting = ref(false)
const confirmTarget = computed(() => data.value?.user.email ?? id)
async function deleteUser() {
  deleting.value = true
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    toast.add({ title: `Deleted ${confirmTarget.value}`, color: 'success' })
    await navigateTo('/users')
  } catch (e: any) {
    toast.add({ title: 'Could not delete user', description: e?.data?.statusMessage ?? 'Try again.', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const voiceSeconds = computed(() => data.value?.voice.reduce((s, v) => s + v.seconds_used, 0) ?? 0)
</script>

<template>
  <UDashboardPanel id="user">
    <template #header>
      <UDashboardNavbar :title="data?.user.email ?? 'User'">
        <template #leading>
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/users" aria-label="Back to users" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert v-if="error" color="error" variant="subtle" title="Could not load user" :description="error.statusMessage" />
      <div v-else-if="data" class="grid lg:grid-cols-3 gap-4 items-start">
        <div class="lg:col-span-2 space-y-4">
          <UCard>
            <template #header><h3 class="font-medium">Profile</h3></template>
            <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt class="text-muted">Name</dt><dd>{{ data.user.display_name || '—' }}</dd></div>
              <div><dt class="text-muted">User ID</dt><dd class="font-mono text-xs break-all">{{ data.user.id }}</dd></div>
              <div><dt class="text-muted">Joined</dt><dd>{{ formatDateTime(data.user.created_at) }}</dd></div>
              <div><dt class="text-muted">Sign-in</dt><dd>{{ data.user.has_password ? 'Email and password' : 'Device only (no password)' }}</dd></div>
              <div><dt class="text-muted">Push</dt><dd>{{ data.user.has_push_token ? 'Registered' : 'No token' }} · notifications {{ data.user.notifications_enabled ? 'on' : 'off' }} ({{ data.user.notification_intensity }})</dd></div>
              <div><dt class="text-muted">Timezone offset</dt><dd>{{ data.user.timezone_offset_minutes }} min</dd></div>
            </dl>
          </UCard>

          <UCard>
            <template #header><h3 class="font-medium">Activity</h3></template>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><div class="text-muted">Completed</div><div class="text-xl font-semibold tabular-nums">{{ formatNumber(data.stats?.total_tasks_completed) }}</div></div>
              <div><div class="text-muted">Streak</div><div class="text-xl font-semibold tabular-nums">{{ data.stats?.current_streak ?? 0 }} <span class="text-sm text-muted font-normal">best {{ data.stats?.longest_streak ?? 0 }}</span></div></div>
              <div><div class="text-muted">Points</div><div class="text-xl font-semibold tabular-nums">{{ formatNumber(data.stats?.points) }} <span class="text-sm text-muted font-normal">{{ data.stats?.level }}</span></div></div>
              <div><div class="text-muted">Focus</div><div class="text-xl font-semibold tabular-nums">{{ formatNumber(data.stats?.total_focus_minutes) }} min</div></div>
            </div>
            <p class="text-sm text-muted mt-3">Last active {{ formatDate(data.stats?.last_active_date) }}</p>
            <table v-if="data.lanes.length" class="w-full text-sm mt-4">
              <thead><tr class="text-left text-muted"><th class="font-normal py-1">Lane</th><th class="font-normal">Open</th><th class="font-normal">Done</th></tr></thead>
              <tbody>
                <tr v-for="l in data.lanes" :key="l.lane" class="border-t border-default">
                  <td class="py-1 capitalize">{{ l.lane }}</td><td class="tabular-nums">{{ l.open }}</td><td class="tabular-nums">{{ l.done }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted mt-4">No tasks yet.</p>
          </UCard>

          <UserBilling :user-id="id" @changed="refresh()" />

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-medium">AI connector keys</h3>
                <UButton v-if="data.connectorKeys.some(k => !k.revoked_at)" size="xs" color="error" variant="soft" label="Revoke all" @click="revoke('connector')" />
              </div>
            </template>
            <ul v-if="data.connectorKeys.length" class="divide-y divide-default text-sm">
              <li v-for="k in data.connectorKeys" :key="k.id" class="flex items-center justify-between gap-2 py-2">
                <div class="min-w-0">
                  <span class="font-mono">{{ k.key_prefix }}…</span> <span class="text-muted">{{ k.label }}</span>
                  <div class="text-xs text-dimmed">Created {{ formatDate(k.created_at) }} · last used {{ formatDate(k.last_used_at) }}</div>
                </div>
                <UBadge v-if="k.revoked_at" color="neutral" variant="subtle" label="Revoked" />
                <UButton v-else size="xs" color="error" variant="ghost" label="Revoke" @click="revoke('connector', k.id)" />
              </li>
            </ul>
            <p v-else class="text-sm text-muted">No connector keys.</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-medium">OAuth sessions (MCP)</h3>
                <UButton v-if="data.oauthTokens.some(t => !t.revoked_at)" size="xs" color="error" variant="soft" label="Revoke all" @click="revoke('oauth')" />
              </div>
            </template>
            <ul v-if="data.oauthTokens.length" class="divide-y divide-default text-sm">
              <li v-for="t in data.oauthTokens" :key="t.id" class="flex items-center justify-between gap-2 py-2">
                <div class="min-w-0">
                  {{ t.client }}
                  <div class="text-xs text-dimmed">Created {{ formatDate(t.created_at) }} · last used {{ formatDate(t.last_used_at) }}</div>
                </div>
                <UBadge v-if="t.revoked_at" color="neutral" variant="subtle" label="Revoked" />
                <UButton v-else size="xs" color="error" variant="ghost" label="Revoke" @click="revoke('oauth', t.id)" />
              </li>
            </ul>
            <p v-else class="text-sm text-muted">No OAuth sessions.</p>
          </UCard>
        </div>

        <div class="space-y-4">
          <UCard>
            <template #header><h3 class="font-medium">Plan</h3></template>
            <UForm :state="plan" class="space-y-4" @submit="savePlan">
              <UFormField label="Subscription status" name="subscriptionStatus" help="RevenueCat webhooks can overwrite this on the next billing event.">
                <USelect v-model="plan.subscriptionStatus" :items="['none', 'trialing', 'active', 'pro', 'past_due']" class="w-full" />
              </UFormField>
              <UFormField label="Trial ends" name="trialEndsAt" help="Only used when status is trialing.">
                <UInput v-model="plan.trialEndsAt" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Lifetime tasks created" name="lifetimeTasksCreated" help="Free Pro trial ends at 10. Lower it to extend the trial.">
                <UInput v-model.number="plan.lifetimeTasksCreated" type="number" min="0" class="w-full" />
              </UFormField>
              <UButton type="submit" :loading="saving" label="Save plan" />
            </UForm>
          </UCard>

          <UCard>
            <template #header><h3 class="font-medium">Team</h3></template>
            <ul v-if="data.team.length" class="space-y-2 text-sm">
              <li v-for="m in data.team" :key="m.id">
                <NuxtLink :to="`/users/${m.teammate_id}`" class="hover:text-primary">{{ m.nickname || m.display_name || m.email }}</NuxtLink>
                <span v-if="m.role" class="text-muted"> · {{ m.role }}</span>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">No teammates.</p>
          </UCard>

          <UCard>
            <template #header><h3 class="font-medium">Voice, last 30 days</h3></template>
            <p class="text-2xl font-semibold tabular-nums">{{ formatMinutes(voiceSeconds) }}</p>
            <p class="text-sm text-muted">across {{ data.voice.length }} days</p>
          </UCard>

          <UCard :ui="{ root: 'ring-error/40' }">
            <template #header><h3 class="font-medium text-error">Delete account</h3></template>
            <p class="text-sm text-muted mb-3">Permanently deletes this user, their tasks, subtasks, contacts, team links and stats. This cannot be undone.</p>
            <UButton color="error" variant="soft" :label="`Delete ${confirmTarget}`" @click="confirmText = ''; deleteOpen = true" />
          </UCard>
        </div>
      </div>

      <UModal v-model:open="deleteOpen" :title="`Delete ${confirmTarget}?`" description="This permanently removes the account and all of its data.">
        <template #body>
          <UFormField :label="`Type ${confirmTarget} to confirm`" name="confirm">
            <UInput v-model="confirmText" class="w-full" autocomplete="off" />
          </UFormField>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton color="neutral" variant="ghost" label="Keep account" @click="deleteOpen = false" />
            <UButton color="error" :disabled="confirmText !== confirmTarget" :loading="deleting" :label="`Delete ${confirmTarget}`" @click="deleteUser" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
