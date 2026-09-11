<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import StarField from './StarField.vue'

// Full-screen WebGL layer: the orbit view behind the page, and the arena in
// hack mode. three.js loads after first paint; until then, or if WebGL is
// missing, the 2D starfield stands in.
defineProps({
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['ready', 'failed', 'game', 'flash'])

const canvas = ref(null)
const ready = ref(false)
const fallbackVisible = ref(true)
let engine = null
let fallbackTimer = 0

onMounted(async () => {
  try {
    const { createBackdrop } = await import('../three/backdrop.js')
    engine = createBackdrop(canvas.value, {
      onGame: (e) => emit('game', e),
      onFlash: () => emit('flash'),
    })
    ready.value = true
    // Keep the 2D stars until the WebGL canvas has faded in over them.
    fallbackTimer = setTimeout(() => (fallbackVisible.value = false), 900)
    emit('ready')
  } catch (err) {
    console.warn('3D backdrop unavailable, keeping the 2D starfield.', err)
    emit('failed')
  }
})

onBeforeUnmount(() => {
  clearTimeout(fallbackTimer)
  engine?.dispose()
})

defineExpose({
  enterHack: () => engine?.enterHack(),
  exitHack: () => engine?.exitHack(),
  restartHack: () => engine?.restartHack(),
})
</script>

<template>
  <StarField v-if="fallbackVisible" />
  <canvas
    ref="canvas"
    class="backdrop"
    :class="{ 'is-ready': ready, 'is-active': active }"
    :role="active ? 'img' : null"
    :aria-hidden="active ? null : 'true'"
    :aria-label="
      active
        ? 'Hacking arena. Move with W A S D, the arrow keys or the pointer. Firing is automatic. Escape exits.'
        : null
    "
  ></canvas>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 800ms var(--ease);
}

.backdrop.is-ready {
  opacity: 1;
}

/* In hack mode the canvas is the game: it takes the pointer and blocks scroll/zoom gestures. */
.backdrop.is-active {
  pointer-events: auto;
  touch-action: none;
  cursor: none;
}

@media (hover: none) {
  .backdrop.is-active {
    cursor: auto;
  }
}
</style>
