<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

// A circuit trace from the operator's core to the engaged access node:
// out of the hologram, down the gutter between the panels, into the node's
// screen. It lives inside the frame, so it scrolls with the page for free.
const props = defineProps({
  target: { type: String, default: null },
})

const svg = ref(null)
const d = ref('')
const box = ref({ w: 0, h: 0 })
const ends = ref(null)
const drawKey = ref(0)
let ro = null
let frame = 0

function measure() {
  const el = svg.value
  const host = el?.parentElement
  if (!host || !props.target) {
    d.value = ''
    return
  }
  const src = host.querySelector('[data-link-source]')
  const dst = host.querySelector(`[data-link-target="${props.target}"]`)
  const panel = src?.closest('section')
  if (!src || !dst || !panel) {
    d.value = ''
    return
  }
  const f = host.getBoundingClientRect()
  const s = src.getBoundingClientRect()
  const t = dst.getBoundingClientRect()
  const p = panel.getBoundingClientRect()

  box.value = { w: f.width, h: f.height }
  const sx = s.left + s.width * 0.5 + 64 - f.left
  const sy = s.top + s.height * 0.46 - f.top
  const gx = (p.right + t.left) / 2 - f.left
  const tx = t.left + 18 - f.left
  const ty = t.top + t.height * 0.5 - f.top
  const c = Math.min(10, Math.abs(ty - sy) / 2)
  const dir = ty >= sy ? 1 : -1

  // Right, chamfer, down (or up), chamfer, right.
  d.value = [
    `M ${sx} ${sy}`,
    `H ${gx - c}`,
    `L ${gx} ${sy + c * dir}`,
    `V ${ty - c * dir}`,
    `L ${gx + c} ${ty}`,
    `H ${tx}`,
  ].join(' ')
  ends.value = { sx, sy, tx, ty }
}

function schedule() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measure)
}

watch(
  () => props.target,
  async () => {
    await nextTick()
    measure()
    drawKey.value += 1
  },
)

onMounted(() => {
  const host = svg.value?.parentElement
  ro = new ResizeObserver(schedule)
  if (host) ro.observe(host)
  window.addEventListener('resize', schedule)
  document.fonts?.ready.then(schedule)
  schedule()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  ro?.disconnect()
  window.removeEventListener('resize', schedule)
})
</script>

<template>
  <svg
    ref="svg"
    class="link"
    :viewBox="`0 0 ${box.w || 1} ${box.h || 1}`"
    aria-hidden="true"
    focusable="false"
  >
    <g v-if="d">
      <path :d="d" class="link__base" />
      <path :key="drawKey" :d="d" class="link__draw" pathLength="1" />
      <path :d="d" class="link__flow" />
      <circle :key="'p' + drawKey" r="3.2" class="link__packet" :style="{ offsetPath: `path('${d}')` }" />
      <rect v-if="ends" :x="ends.sx - 3" :y="ends.sy - 3" width="6" height="6" class="link__end" />
      <rect
        v-if="ends"
        :x="ends.tx - 4"
        :y="ends.ty - 4"
        width="8"
        height="8"
        class="link__end link__end--target"
        :transform="`rotate(45 ${ends.tx} ${ends.ty})`"
      />
    </g>
  </svg>
</template>

<style scoped>
.link {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
  overflow: visible;
}

.link__base {
  fill: none;
  stroke: rgba(220, 216, 192, 0.14);
  stroke-width: 1;
}

.link__draw {
  fill: none;
  stroke: var(--sig-text);
  stroke-width: 1.2;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: linkDraw 700ms var(--ease) forwards;
  filter: drop-shadow(0 0 3px rgba(224, 87, 79, 0.7));
}

.link__flow {
  fill: none;
  stroke: rgba(240, 236, 216, 0.7);
  stroke-width: 1;
  stroke-dasharray: 3 9;
  animation: linkFlow 900ms linear infinite;
}

.link__packet {
  fill: #fffbe8;
  offset-rotate: 0deg;
  filter: drop-shadow(0 0 4px rgba(255, 251, 232, 0.9));
  animation: linkPacket 1.6s var(--ease) 700ms infinite;
  offset-distance: 0%;
  opacity: 0;
}

.link__end {
  fill: var(--bone);
}

.link__end--target {
  fill: var(--sig-text);
}

@keyframes linkDraw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes linkFlow {
  to {
    stroke-dashoffset: -12;
  }
}

@keyframes linkPacket {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}

@media (max-width: 900px) {
  .link {
    display: none;
  }
}
</style>
