<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import DecryptText from './DecryptText.vue'

// Live readout for whichever node is engaged. Decorative throughout: the
// figures are derived from the node id and a little noise, and none of it
// measures anything real.
const props = defineProps({
  node: { type: Object, required: true },
  pulse: { type: Number, default: 0 },
})

function hash(input) {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

const seed = computed(() => hash(props.node.id))
const vector = computed(() => `${String(seed.value % 360).padStart(3, '0')}.${String(seed.value % 90).padStart(2, '0')}`)
const latency = computed(() => `${8 + (seed.value % 22)} ms`)
const bars = computed(() => 3 + (seed.value % 3))

// ---------- throughput graph ----------
const canvas = ref(null)
const rate = ref(0)
const N = 64
const samples = Array.from({ length: N }, () => 0.35 + Math.random() * 0.2)
let boost = 0
let timer = 0
let ro = null
const calm = window.matchMedia('(prefers-reduced-motion: reduce)')

function draw() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  const w = c.width
  const h = c.height
  ctx.clearRect(0, 0, w, h)
  const step = w / (N - 1)
  const y = (v) => h - v * h * 0.9 - 1

  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, 'rgba(220, 216, 192, 0.28)')
  grad.addColorStop(1, 'rgba(220, 216, 192, 0)')
  ctx.beginPath()
  ctx.moveTo(0, h)
  samples.forEach((v, i) => ctx.lineTo(i * step, y(v)))
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  ctx.beginPath()
  samples.forEach((v, i) => (i ? ctx.lineTo(i * step, y(v)) : ctx.moveTo(0, y(v))))
  ctx.strokeStyle = '#dcd8c0'
  ctx.lineWidth = Math.max(1, w / c.clientWidth) * 1.2
  ctx.stroke()

  // Emphasise the newest sample.
  const lx = (N - 1) * step
  const ly = y(samples[N - 1])
  ctx.fillStyle = '#e0574f'
  ctx.fillRect(lx - 3, ly - 3, 6, 6)
}

function size() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = Math.round(c.clientWidth * dpr)
  c.height = Math.round(c.clientHeight * dpr)
  draw()
}

function tick() {
  if (document.hidden) return
  boost *= 0.86
  const base = 0.32 + seed.value % 7 * 0.03
  const next = Math.min(0.98, base + Math.random() * 0.22 + boost)
  samples.shift()
  samples.push(next)
  rate.value = Math.round(next * 1840 + 120)
  draw()
}

// A new target makes the line spike.
watch(
  () => props.pulse,
  () => {
    boost = 0.5
  },
)

onMounted(() => {
  size()
  ro = new ResizeObserver(size)
  ro.observe(canvas.value)
  rate.value = Math.round(samples[N - 1] * 1840 + 120)
  if (!calm.matches) timer = setInterval(tick, 140)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  ro?.disconnect()
})
</script>

<template>
  <aside class="uplink" aria-hidden="true">
    <div class="uplink__cell uplink__cell--target">
      <span class="label">Target</span>
      <span class="uplink__val uplink__val--big"><DecryptText :text="node.label" :trigger="pulse" /></span>
    </div>
    <div class="uplink__cell">
      <span class="label">Vector</span>
      <span class="uplink__val">{{ vector }}</span>
    </div>
    <div class="uplink__cell">
      <span class="label">Latency</span>
      <span class="uplink__val">{{ latency }}</span>
    </div>
    <div class="uplink__cell uplink__cell--graph">
      <span class="uplink__graph-head">
        <span class="label">Throughput</span>
        <span class="uplink__val">{{ rate.toLocaleString('en-GB') }} kb/s</span>
      </span>
      <canvas ref="canvas" class="uplink__canvas"></canvas>
    </div>
    <div class="uplink__cell">
      <span class="label">Signal</span>
      <span class="uplink__bars">
        <i v-for="i in 5" :key="i" :class="{ 'is-on': i <= bars }" :style="{ height: 4 + i * 3 + 'px' }"></i>
      </span>
    </div>
  </aside>
</template>

<style scoped>
.uplink {
  display: grid;
  grid-template-columns: 1.7fr 0.8fr 0.8fr 1.9fr 0.7fr;
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}

.uplink__cell {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  background: #131210;
}

.uplink__val {
  font-family: var(--mono);
  font-size: 0.8125rem;
  color: var(--bone);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The target name wraps rather than truncating — it is the one value here that must read whole. */
.uplink__val--big {
  white-space: normal;
  font-family: var(--display);
  font-size: 1.0625rem;
  line-height: 1.1;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.uplink__graph-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.uplink__canvas {
  display: block;
  width: 100%;
  height: 30px;
}

.uplink__bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
}

.uplink__bars i {
  width: 5px;
  background: rgba(220, 216, 192, 0.16);
}

.uplink__bars i.is-on {
  background: var(--bone);
}

@container matrix (max-width: 720px) {
  .uplink {
    grid-template-columns: 1fr 1fr;
  }

  /* Target, graph and signal take full rows, so no half-empty row shows the gap colour. */
  .uplink__cell--target,
  .uplink__cell--graph,
  .uplink__cell:last-child {
    grid-column: 1 / -1;
  }
}
</style>
