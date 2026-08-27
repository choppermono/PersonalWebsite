<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const ring = ref(null)
const dot = ref(null)
const visible = ref(false)

let raf = 0
let mx = 0
let my = 0
let rx = 0
let ry = 0

function onMove(event) {
  mx = event.clientX
  my = event.clientY
  if (!visible.value) {
    rx = mx
    ry = my
    visible.value = true
  }
}

function onLeave() {
  visible.value = false
}

function loop() {
  // The dot tracks exactly, the ring lags behind. That gap is the whole effect.
  rx += (mx - rx) * 0.18
  ry += (my - ry) * 0.18

  if (ring.value) ring.value.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
  if (dot.value) dot.value.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`

  raf = requestAnimationFrame(loop)
}

let enabled = false

onMounted(() => {
  // Pointer-driven decoration: skip it on touch and for reduced motion.
  enabled =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!enabled) return

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerleave', onLeave)
})
</script>

<template>
  <div v-if="enabled" class="reticle" :class="{ 'is-visible': visible }" aria-hidden="true">
    <div ref="ring" class="reticle__ring"></div>
    <div ref="dot" class="reticle__dot"></div>
  </div>
</template>

<style scoped>
.reticle {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}

.reticle.is-visible {
  opacity: 1;
}

.reticle__ring,
.reticle__dot {
  position: fixed;
  top: 0;
  left: 0;
  will-change: transform;
}

.reticle__ring {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(220, 216, 192, 0.55);
  border-radius: 50%;
}

.reticle__ring::before,
.reticle__ring::after {
  content: '';
  position: absolute;
  background: rgba(220, 216, 192, 0.55);
}

.reticle__ring::before {
  top: 50%;
  left: -6px;
  width: 5px;
  height: 1px;
}

.reticle__ring::after {
  top: 50%;
  right: -6px;
  width: 5px;
  height: 1px;
}

.reticle__dot {
  width: 4px;
  height: 4px;
  background: var(--bone);
  border-radius: 50%;
}
</style>
