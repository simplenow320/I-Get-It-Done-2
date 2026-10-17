<script setup lang="ts">
definePageMeta({ layout: false, public: true })

const APP_STORE_URL = 'https://apps.apple.com/app/id6756545884'
const icon = `${useRuntimeConfig().app.baseURL}app-icon.png`

useSeoMeta({
  title: 'I GET IT DONE: the task app built for ADHD brains',
  description: 'Quick capture, visual focus timers, rewards that keep you going, and a 4-lane system that keeps today clear. Free to start on iPhone.',
  ogTitle: 'I GET IT DONE',
  ogDescription: 'Now. Soon. Done. The task app built for how ADHD brains actually work.',
  ogType: 'website',
  ogImage: icon,
  twitterCard: 'summary'
})
useHead({ htmlAttrs: { lang: 'en', class: 'dark' } })

const lanes = [
  { name: 'Now', color: '#FF3B30', text: 'Today\'s focus. A short list with clear priorities, so you are not deciding all day.', tasks: ['Call the dentist', 'Send invoice'] },
  { name: 'Soon', color: '#FF9500', text: 'The next few days. Visible, but not shouting at you.', tasks: ['Book car service'] },
  { name: 'Later', color: '#007AFF', text: 'Future weeks. Captured, not forgotten, and out of today\'s head space.', tasks: ['Plan birthday trip'] },
  { name: 'Park', color: '#AF52DE', text: 'Ideas on hold. A safe place that keeps them without the guilt.', tasks: ['Learn guitar'] }
]

const problems = [
  { icon: 'i-lucide-clock-alert', title: 'Time blindness', text: 'Visual countdown rings, and tasks that move lanes on their own when dates pass, keep you anchored to real time.' },
  { icon: 'i-lucide-rocket', title: 'Getting started', text: 'One-tap Quick Dump, short focus sprints and Break It Down make the first step small enough to take.' },
  { icon: 'i-lucide-layers', title: 'Overwhelm', text: 'Subtasks, progress bars and four simple lanes turn a wall of to-dos into a few tiny wins.' },
  { icon: 'i-lucide-zap', title: 'Low motivation', text: 'Streaks, points, levels and celebrations give your brain the reward it is looking for.' },
  { icon: 'i-lucide-brain', title: 'Working memory', text: 'Say it out loud. Voice capture turns a ramble into a clean task list before the thought slips away.' },
  { icon: 'i-lucide-compass', title: 'Lost priorities', text: 'Gentle nudges bring the right task back to the top when it actually matters.' }
]

const features = [
  { icon: 'i-lucide-mic', title: 'Quick Dump', text: 'Talk or type. Get everything out of your head in seconds and sort it later.' },
  { icon: 'i-lucide-timer', title: 'Focus Timer', text: '10, 15 or 25 minute sprints with a visual ring, so time feels real.' },
  { icon: 'i-lucide-list-checks', title: 'Break It Down', text: 'Split big tasks into small steps and watch the progress bar fill.' },
  { icon: 'i-lucide-trophy', title: 'Streaks and levels', text: 'Earn points, keep streaks alive and unlock achievements as you finish.' },
  { icon: 'i-lucide-users', title: 'Team Hub', text: 'Hand off tasks to family or coworkers, add notes and see where things stand.' },
  { icon: 'i-lucide-refresh-ccw', title: 'Weekly Reset', text: 'Celebrate what got done, clear what went stale and set up next week.' }
]

const free = ['Unlimited tasks', 'The 4-lane system', 'Quick Dump and Break It Down', 'Your progress dashboard']
const pro = ['Voice capture', 'Focus Mode and timers', 'Streaks, points and achievements', 'Team delegation', 'Weekly Reset insights']
</script>

<template>
  <div class="min-h-dvh bg-black text-white antialiased">
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black">Skip to content</a>

    <header class="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" class="flex items-center gap-2.5 font-bold tracking-tight">
          <img :src="icon" alt="" width="32" height="32" class="size-8 rounded-lg">
          I GET IT DONE
        </a>
        <nav aria-label="Main" class="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#lanes" class="hover:text-white">How it works</a>
          <a href="#features" class="hover:text-white">Features</a>
          <a href="#pricing" class="hover:text-white">Pricing</a>
        </nav>
        <a :href="APP_STORE_URL" class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">Get the app</a>
      </div>
    </header>

    <main id="main">
      <!-- Hero -->
      <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 md:pt-24 lg:grid-cols-2">
        <div>
          <p class="text-sm font-semibold uppercase tracking-widest text-[#FF9500]">Built for ADHD brains</p>
          <h1 class="mt-4 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Now.<br><span class="text-white/60">Soon.</span><br><span class="text-[#FF3B30]">Done.</span>
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            The task app designed for how your brain actually works. Capture everything fast, focus on one thing, and get a little win every time you finish.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a :href="APP_STORE_URL" class="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-black hover:bg-white/90">
              Download for iPhone
            </a>
            <a href="#lanes" class="rounded-full px-6 py-3.5 font-semibold text-white ring-1 ring-white/25 hover:ring-white/50">See how it works</a>
          </div>
          <p class="mt-4 text-sm text-white/50">Free forever for the basics. Your first 10 tasks unlock every Pro feature.</p>
        </div>

        <!-- Lane preview, drawn with HTML so it stays sharp and accessible -->
        <div class="grid grid-cols-2 gap-3 sm:gap-4" role="img" aria-label="Preview of the four lanes: Now, Soon, Later and Park, each holding a few tasks">
          <div v-for="lane in lanes" :key="lane.name" class="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <div class="flex items-center gap-2">
              <span class="size-2.5 rounded-full" :style="{ backgroundColor: lane.color }" />
              <span class="text-xs font-bold uppercase tracking-widest" :style="{ color: lane.color }">{{ lane.name }}</span>
            </div>
            <ul class="mt-3 space-y-2">
              <li v-for="task in lane.tasks" :key="task" class="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2.5 text-sm">
                <span class="size-4 shrink-0 rounded-full border-2" :style="{ borderColor: lane.color }" />
                {{ task }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Problems -->
      <section class="border-t border-white/10 bg-white/[0.02]">
        <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Made for the hard parts</h2>
          <p class="mt-3 max-w-2xl text-white/60">Most task apps assume you just need a list. I GET IT DONE is built around the things that actually get in the way.</p>
          <div class="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="p in problems" :key="p.title">
              <UIcon :name="p.icon" class="size-6 text-[#FF9500]" aria-hidden="true" />
              <h3 class="mt-3 text-lg font-semibold">{{ p.title }}</h3>
              <p class="mt-2 leading-relaxed text-white/60">{{ p.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Lanes -->
      <section id="lanes" class="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Four lanes. Zero overwhelm.</h2>
        <p class="mt-3 max-w-2xl text-white/60">Every task lives in one of four lanes, and overdue tasks move up on their own. You only ever look at what matters right now.</p>
        <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="lane in lanes" :key="lane.name" class="rounded-2xl p-6 ring-1 ring-white/10" :style="{ background: `linear-gradient(160deg, ${lane.color}26, transparent 70%)` }">
            <p class="text-2xl font-extrabold uppercase tracking-wide" :style="{ color: lane.color }">{{ lane.name }}</p>
            <p class="mt-3 leading-relaxed text-white/70">{{ lane.text }}</p>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section id="features" class="scroll-mt-16 border-t border-white/10 bg-white/[0.02]">
        <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Everything that helps you finish</h2>
          <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="f in features" :key="f.title" class="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10">
              <span class="inline-flex size-10 items-center justify-center rounded-xl bg-white/10">
                <UIcon :name="f.icon" class="size-5" aria-hidden="true" />
              </span>
              <h3 class="mt-4 text-lg font-semibold">{{ f.title }}</h3>
              <p class="mt-2 leading-relaxed text-white/60">{{ f.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Start free. Stay free if you like.</h2>
        <p class="mt-3 max-w-2xl text-white/60">Task management is free forever. Your first 10 tasks unlock every Pro feature so you can feel the difference before you decide.</p>
        <div class="mt-10 grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl p-8 ring-1 ring-white/15">
            <h3 class="text-xl font-bold">Free</h3>
            <p class="mt-1 text-white/60">Forever</p>
            <ul class="mt-6 space-y-3">
              <li v-for="item in free" :key="item" class="flex gap-3"><UIcon name="i-lucide-check" class="mt-0.5 size-5 shrink-0 text-white/70" aria-hidden="true" />{{ item }}</li>
            </ul>
          </div>
          <div class="rounded-2xl bg-gradient-to-br from-[#FF3B30]/25 via-[#FF9500]/10 to-transparent p-8 ring-1 ring-[#FF9500]/40">
            <h3 class="text-xl font-bold">Pro</h3>
            <p class="mt-1 text-white/60">Monthly or yearly, with a 7-day free trial</p>
            <ul class="mt-6 space-y-3">
              <li v-for="item in pro" :key="item" class="flex gap-3"><UIcon name="i-lucide-check" class="mt-0.5 size-5 shrink-0 text-[#FF9500]" aria-hidden="true" />{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Final call to action -->
      <section class="border-t border-white/10">
        <div class="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <img :src="icon" alt="" width="72" height="72" class="mx-auto size-18 rounded-2xl" loading="lazy">
          <h2 class="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Stop planning. Start finishing.</h2>
          <p class="mt-4 text-lg text-white/60">Download I GET IT DONE and clear your head in the next five minutes.</p>
          <a :href="APP_STORE_URL" class="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-black hover:bg-white/90">
            Download for iPhone
          </a>
        </div>
      </section>
    </main>

    <footer class="border-t border-white/10">
      <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {{ new Date().getFullYear() }} SimpleNow. All rights reserved.</p>
        <nav aria-label="Legal" class="flex flex-wrap gap-x-6 gap-y-2">
          <a href="/support" class="hover:text-white">Support</a>
          <a href="/privacy" class="hover:text-white">Privacy</a>
          <a href="/terms" class="hover:text-white">Terms</a>
          <a href="/data-deletion" class="hover:text-white">Delete your data</a>
        </nav>
      </div>
    </footer>
  </div>
</template>
