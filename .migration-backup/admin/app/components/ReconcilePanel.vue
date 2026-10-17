<script setup lang="ts">
type Result = Awaited<ReturnType<typeof run>>
const toast = useToast()
const running = ref(false)
const fixing = ref(false)
const result = ref<Result | null>(null)
const error = ref('')

const SEVERITY: Record<string, { label: string, color: 'error' | 'warning' | 'info' | 'neutral', help: string }> = {
  locked_out: { label: 'Paid, no access', color: 'error', help: 'RevenueCat says they have access but the app does not.' },
  free_access: { label: 'Access, not paid', color: 'warning', help: 'The app grants access RevenueCat no longer shows.' },
  manual_grant: { label: 'Manual grant', color: 'info', help: 'Set to pro by hand. Left alone unless you fix it on purpose.' },
  label: { label: 'Status differs', color: 'neutral', help: 'Same access, different status label.' },
  error: { label: 'Check failed', color: 'error', help: '' }
}

function run() {
  return $fetch('/api/reconcile', { method: 'POST' })
}

async function check() {
  running.value = true
  error.value = ''
  try {
    result.value = await run()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'The check failed. Try again.'
  } finally {
    running.value = false
  }
}

// Manual grants are excluded from "fix all": removing comp access should be a deliberate per-user choice.
const fixable = computed(() => result.value?.mismatches.filter(m => m.severity !== 'manual_grant' && m.severity !== 'error') ?? [])

async function fix(userIds: string[]) {
  fixing.value = true
  try {
    const r = await $fetch('/api/reconcile/apply', { method: 'POST', body: { userIds } })
    toast.add({ title: `Fixed ${r.fixed} user${r.fixed === 1 ? '' : 's'}`, description: r.failed ? `${r.failed} could not be checked.` : undefined, color: r.failed ? 'warning' : 'success' })
    await check()
  } catch (e: any) {
    toast.add({ title: 'Could not apply fixes', description: e?.data?.statusMessage ?? 'Try again.', color: 'error' })
  } finally {
    fixing.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-medium">Reconcile with RevenueCat</h3>
          <p class="text-sm text-muted">Checks every user on a paid, trial or past-due status, plus anyone with a recorded payment, against RevenueCat.</p>
        </div>
        <UButton icon="i-lucide-scan-search" :loading="running" label="Run check" @click="check" />
      </div>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" :description="error" icon="i-lucide-circle-alert" />
    <p v-else-if="!result" class="text-sm text-muted">Not run yet. A run takes a few seconds per hundred users.</p>
    <template v-else>
      <div class="flex flex-wrap items-center gap-2 text-sm mb-3">
        <span>Checked {{ formatNumber(result.checked) }} users<template v-if="result.truncated"> (first 400 only)</template>:</span>
        <UBadge color="success" variant="subtle" :label="`${result.counts.ok ?? 0} match`" />
        <UBadge v-for="(n, k) in result.counts" v-show="k !== 'ok'" :key="k" :color="SEVERITY[k]?.color ?? 'neutral'" variant="subtle" :label="`${n} ${SEVERITY[k]?.label ?? k}`" />
        <UButton v-if="fixable.length" class="ml-auto" color="primary" variant="soft" :loading="fixing" :label="`Fix ${fixable.length} from RevenueCat`" @click="fix(fixable.map(m => m.id))" />
      </div>

      <div v-if="result.mismatches.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-muted"><th class="font-normal py-1">User</th><th class="font-normal">Problem</th><th class="font-normal">App says</th><th class="font-normal">RevenueCat says</th><th /></tr></thead>
          <tbody>
            <tr v-for="m in result.mismatches" :key="m.id" class="border-t border-default align-top">
              <td class="py-2"><NuxtLink :to="`/users/${m.id}`" class="hover:text-primary">{{ m.email ?? m.id }}</NuxtLink></td>
              <td>
                <UTooltip :text="SEVERITY[m.severity]?.help || m.error || ''">
                  <UBadge :color="SEVERITY[m.severity]?.color ?? 'neutral'" variant="subtle" :label="SEVERITY[m.severity]?.label ?? m.severity" />
                </UTooltip>
              </td>
              <td>{{ m.current }}<div v-if="m.currentTrialEndsAt" class="text-xs text-dimmed">trial to {{ formatDate(m.currentTrialEndsAt) }}</div></td>
              <td>{{ m.error ?? m.expected }}<div class="text-xs text-dimmed">{{ m.reason }}</div></td>
              <td class="text-right">
                <UButton v-if="m.severity !== 'error'" size="xs" variant="ghost" :loading="fixing" label="Fix" @click="fix([m.id])" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-muted">Every checked user matches RevenueCat.</p>
    </template>
  </UCard>
</template>
