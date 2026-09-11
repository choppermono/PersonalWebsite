<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// The viewer's local time as an instrument: digits, date, zone and offset,
// with a dial whose sweep hand tracks real seconds and whose arc fills with
// the hour.
const now = ref(new Date())
let timer = 0
onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const pad = (n) => String(n).padStart(2, '0')
const hh = computed(() => pad(now.value.getHours()))
const mm = computed(() => pad(now.value.getMinutes()))
const ss = computed(() => pad(now.value.getSeconds()))
const iso = computed(() => now.value.toISOString())

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
const zoneFmt = new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' })
const date = computed(() => dateFmt.format(now.value))
const zone = computed(() => zoneFmt.formatToParts(now.value).find((p) => p.type === 'timeZoneName')?.value ?? '')
const offset = computed(() => {
  const m = -now.value.getTimezoneOffset()
  const a = Math.abs(m)
  return `UTC${m >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
})

const R = 29
const C = 2 * Math.PI * R
const hourArc = computed(() => {
  const f = (now.value.getMinutes() * 60 + now.value.getSeconds()) / 3600
  return `${(f * C).toFixed(2)} ${C.toFixed(2)}`
})

// Start the sweep where the second hand really is.
const start = new Date()
const sweepDelay = `${-(start.getSeconds() + start.getMilliseconds() / 1000)}s`

const ticks = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2
  const major = i % 5 === 0
  const r0 = major ? 35 : 37.5
  return {
    x1: 44 + Math.sin(a) * r0,
    y1: 44 - Math.cos(a) * r0,
    x2: 44 + Math.sin(a) * 40.5,
    y2: 44 - Math.cos(a) * 40.5,
    major,
  }
})
</script>

<template>
  <div class="inst clock">
    <div class="inst__head">
      <span class="label">Local time</span>
      <span class="label inst__aux">{{ zone }}</span>
    </div>
    <div class="clock__body">
      <svg class="clock__dial" viewBox="0 0 88 88" aria-hidden="true" focusable="false">
        <line
          v-for="(t, i) in ticks"
          :key="i"
          :x1="t.x1"
          :y1="t.y1"
          :x2="t.x2"
          :y2="t.y2"
          :class="['clock__tick', { 'is-major': t.major }]"
        />
        <circle cx="44" cy="44" :r="R" class="clock__track" />
        <circle cx="44" cy="44" :r="R" class="clock__hour" :stroke-dasharray="hourArc" transform="rotate(-90 44 44)" />
        <g class="clock__sweep" :style="{ animationDelay: sweepDelay }">
          <line x1="44" y1="48" x2="44" y2="8" />
          <circle cx="44" cy="8" r="1.8" />
        </g>
        <circle cx="44" cy="44" r="2.6" class="clock__hub" />
      </svg>

      <div class="clock__read">
        <time class="clock__digits" :datetime="iso">{{ hh }}:{{ mm }}<span class="clock__sec">:{{ ss }}</span></time>
        <span class="clock__date">{{ date }}</span>
        <span class="clock__offset">{{ offset }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clock__body {
  display: flex;
  align-items: center;
  gap: 14px;
}

.clock__dial {
  flex: 0 0 auto;
  width: 84px;
  height: 84px;
  overflow: visible;
}

.clock__tick {
  stroke: rgba(220, 216, 192, 0.28);
  stroke-width: 0.8;
}

.clock__tick.is-major {
  stroke: var(--bone);
  stroke-width: 1.2;
}

.clock__track {
  fill: none;
  stroke: rgba(220, 216, 192, 0.1);
  stroke-width: 3;
}

.clock__hour {
  fill: none;
  stroke: var(--bone);
  stroke-width: 3;
  transition: stroke-dasharray 1s linear;
}

.clock__sweep {
  transform-box: view-box;
  transform-origin: 44px 44px;
  animation: sweep 60s linear infinite;
}

.clock__sweep line {
  stroke: var(--sig-text);
  stroke-width: 1;
}

.clock__sweep circle {
  fill: var(--sig-text);
}

.clock__hub {
  fill: var(--bone);
}

@keyframes sweep {
  to {
    transform: rotate(360deg);
  }
}

.clock__read {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.clock__digits {
  font-family: var(--mono);
  font-size: 1.75rem;
  font-weight: 500;
  line-height: 1;
  color: var(--bone);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  text-shadow: 0 0 14px rgba(220, 216, 192, 0.25);
}

.clock__sec {
  font-size: 0.6em;
  color: var(--sig-text);
  margin-left: 1px;
}

.clock__date,
.clock__offset {
  font-family: var(--mono);
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--bone-dim);
}

.clock__offset {
  color: var(--bone-mute);
}
</style>
