<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// Status with a live oscilloscope trace. Clean sine when online; after the
// hack it turns red and noisy.
const props = defineProps({
  breached: { type: Boolean, default: false },
})

const canvas = ref(null)
let ctx = null
let raf = 0
let visible = true
let lastDraw = 0
let io = null
let ro = null
const calm = window.matchMedia('(prefers-reduced-motion: reduce)')

function size() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = Math.round(c.clientWidth * dpr)
  c.height = Math.round(c.clientHeight * dpr)
}

function draw(t) {
  const c = canvas.value
  if (!c || !ctx) return
  const w = c.width
  const h = c.height
  const dpr = w / (c.clientWidth || 1)
  ctx.clearRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(220, 216, 192, 0.09)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 1; i < 8; i++) {
    const x = Math.round((w * i) / 8) + 0.5
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let i = 1; i < 4; i++) {
    const y = Math.round((h * i) / 4) + 0.5
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()

  const color = props.breached ? '#e0574f' : '#dcd8c0'
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 6 * dpr
  ctx.lineWidth = 1.4 * dpr
  ctx.beginPath()
  const noise = props.breached ? 0.55 : 0.05
  for (let x = 0; x <= w; x += 2) {
    const u = x / w
    const env = Math.sqrt(Math.sin(u * Math.PI))
    const v =
      Math.sin(u * 17 + t * 3.6) * 0.34 +
      Math.sin(u * 49 - t * 6.1) * 0.12 +
      (Math.random() - 0.5) * noise
    const y = h / 2 + v * env * (h / 2) * 0.9
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  // 30 fps is plenty for a trace this size.
  if (t - lastDraw < 33) return
  lastDraw = t
  draw(t / 1000)
}

function sync() {
  cancelAnimationFrame(raf)
  raf = 0
  if (visible && !calm.matches && !document.hidden) raf = requestAnimationFrame(loop)
  else draw(1.2)
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  size()
  ro = new ResizeObserver(() => {
    size()
    draw(performance.now() / 1000)
  })
  ro.observe(canvas.value)
  io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    sync()
  })
  io.observe(canvas.value)
  document.addEventListener('visibilitychange', sync)
  calm.addEventListener('change', sync)
  sync()
})

watch(() => props.breached, () => draw(performance.now() / 1000))

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  io?.disconnect()
  document.removeEventListener('visibilitychange', sync)
  calm.removeEventListener('change', sync)
})
</script>

<template>
  <div class="inst scope" :class="{ 'is-breached': breached }">
    <div class="inst__head">
      <span class="label">Status</span>
      <span class="scope__state">
        <span class="scope__dot" aria-hidden="true"></span>{{ breached ? 'Breached' : 'Online' }}
      </span>
    </div>
    <canvas ref="canvas" class="scope__canvas" aria-hidden="true"></canvas>
  </div>
</template>

<style scoped>
.scope__state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--bone);
}

.scope.is-breached .scope__state {
  color: var(--sig-text);
}

.scope__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sig-fill);
  box-shadow: 0 0 8px var(--sig-fill);
  animation: blink 1.6s steps(2, end) infinite;
}

.scope__canvas {
  display: block;
  width: 100%;
  height: 44px;
  border: 1px solid rgba(220, 216, 192, 0.1);
  background: rgba(11, 10, 8, 0.6);
}

@keyframes blink {
  50% {
    opacity: 0.2;
  }
}
</style>
