<script setup lang="ts">
definePageMeta({ layout: false })

const { admin } = useAdmin()
const state = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function signIn() {
  error.value = ''
  loading.value = true
  try {
    admin.value = await $fetch('/api/auth/login', { method: 'POST', body: state })
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not sign in. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 bg-default">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">I GET IT DONE Admin</h1>
        <p class="text-sm text-muted">Sign in with your app account. Only allowlisted emails have access.</p>
      </template>
      <UForm :state="state" class="space-y-4" @submit="signIn">
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" type="email" autocomplete="username" class="w-full" autofocus />
        </UFormField>
        <UFormField label="Password" name="password" required>
          <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :description="error" icon="i-lucide-circle-alert" />
        <UButton type="submit" block :loading="loading" label="Sign in" />
      </UForm>
    </UCard>
  </div>
</template>
