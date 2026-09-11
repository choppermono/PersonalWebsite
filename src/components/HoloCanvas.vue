<script setup>
import { ref, inject, watch, onMounted, onBeforeUnmount } from 'vue'

// A hologram slot. The shared stage (one WebGL context for the whole page)
// draws the named view into this canvas. The default slot is what shows
// while three.js loads, and stays if WebGL is unavailable.
const props = defineProps({
  kind: { type: String, required: true },
  state: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['activate'])

const canvas = ref(null)
const ready = ref(false)
const holo = inject('holo', null)
let handle = null
let gone = false

onMounted(async () => {
  const env = holo ? await holo : null
  if (gone || !env) return
  const factory = env.views[props.kind]
  if (!factory) return
  try {
    handle = env.stage.add(
      canvas.value,
      (base) => factory({ ...base, onActivate: () => emit('activate') }),
      { ...props.state },
    )
    ready.value = true
  } catch (err) {
    console.warn(`Hologram "${props.kind}" unavailable.`, err)
  }
})

watch(
  () => ({ ...props.state }),
  (state) => handle?.set(state),
)

onBeforeUnmount(() => {
  gone = true
  handle?.dispose()
})
</script>

<template>
  <div class="holo" :class="{ 'is-ready': ready }">
    <div class="holo__fallback" aria-hidden="true"><slot /></div>
    <canvas ref="canvas" class="holo__canvas" aria-hidden="true"></canvas>
  </div>
</template>

<style scoped>
.holo {
  position: relative;
  width: 100%;
  height: 100%;
}

.holo__fallback,
.holo__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 700ms var(--ease);
}

.holo__fallback {
  display: grid;
  place-items: center;
}

.holo__canvas {
  display: block;
  opacity: 0;
}

.holo.is-ready .holo__canvas {
  opacity: 1;
}

.holo.is-ready .holo__fallback {
  opacity: 0;
}
</style>
