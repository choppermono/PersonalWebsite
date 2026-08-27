<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvas = ref(null)

let ctx = null
let stars = []
let frame = 0
let width = 0
let height = 0
let dpr = 1
let reduced = false

// Parallax target vs. current, so the field eases instead of snapping.
let targetX = 0
let targetY = 0
let driftX = 0
let driftY = 0

const STAR_COUNT = 340

function seedStars() {
  stars = Array.from({ length: STAR_COUNT }, () => {
    // depth 0 = far and faint, 1 = near and bright. Drives size, alpha, parallax.
    const depth = Math.random()
    return {
      x: Math.random(),
      y: Math.random(),
      depth,
      radius: 0.35 + depth * 1.15,
      alpha: 0.18 + depth * 0.55,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.4,
    }
  })
}

function resize() {
  const el = canvas.value
  if (!el) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = el.clientWidth
  height = el.clientHeight
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function render(time) {
  ctx.clearRect(0, 0, width, height)

  // Ease the parallax offset toward the pointer position.
  driftX += (targetX - driftX) * 0.045
  driftY += (targetY - driftY) * 0.045

  for (const star of stars) {
    const px = star.x * width + driftX * star.depth
    const py = star.y * height + driftY * star.depth

    // Wrap so the field never shows an empty edge while drifting.
    const x = ((px % width) + width) % width
    const y = ((py % height) + height) % height

    const twinkle = reduced ? 1 : 0.68 + 0.32 * Math.sin(time * 0.001 * star.speed + star.phase)

    ctx.globalAlpha = star.alpha * twinkle
    ctx.fillStyle = '#dcd8c0'
    ctx.beginPath()
    ctx.arc(x, y, star.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

function loop(time) {
  render(time)
  frame = requestAnimationFrame(loop)
}

function onPointerMove(event) {
  if (reduced) return
  targetX = (event.clientX / window.innerWidth - 0.5) * -48
  targetY = (event.clientY / window.innerHeight - 0.5) * -32
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  ctx = el.getContext('2d')
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  seedStars()
  resize()

  if (reduced) {
    // Paint one static frame and stop. No loop, no pointer listener.
    render(0)
    window.addEventListener('resize', onResize)
    return
  }

  frame = requestAnimationFrame(loop)
  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
})

function onResize() {
  resize()
  if (reduced) render(0)
}

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
})
</script>

<template>
  <canvas ref="canvas" class="starfield" aria-hidden="true"></canvas>
</template>

<style scoped>
.starfield {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  z-index: 0;
}
</style>
