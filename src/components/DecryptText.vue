<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// Text that decrypts into place. The real text never changes, so the
// accessible name stays stable; the scrambled copy is an aria-hidden overlay
// on top of a transparent original, so nothing reflows while it churns.
const props = defineProps({
  text: { type: String, required: true },
  // Bump to replay. 0 means "don't run on mount".
  trigger: { type: Number, default: 0 },
  steps: { type: Number, default: 14 },
  stepMs: { type: Number, default: 34 },
  glyphs: { type: String, default: 'AEHIKMNRSTXZ#/01' },
})

const scramble = ref('')
let timer = 0

function run() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const target = [...props.text]
  let step = 0
  clearInterval(timer)
  timer = setInterval(() => {
    step += 1
    const settled = Math.floor((step / props.steps) * target.length)
    scramble.value = target
      .map((ch, i) => (ch === ' ' || i < settled ? ch : props.glyphs[Math.floor(Math.random() * props.glyphs.length)]))
      .join('')
    if (step >= props.steps) {
      clearInterval(timer)
      scramble.value = ''
    }
  }, props.stepMs)
}

watch(() => props.trigger, (n) => n && run())
watch(() => props.text, () => run())
onMounted(() => props.trigger && run())
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <span class="dx"
    ><span :class="{ 'dx--masked': scramble }">{{ text }}</span
    ><span v-if="scramble" class="dx__overlay" aria-hidden="true">{{ scramble }}</span></span
  >
</template>

<style scoped>
.dx {
  position: relative;
}

/* transparent, not visibility:hidden — hidden text leaves the accessibility tree */
.dx--masked {
  color: transparent;
}

.dx__overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  white-space: inherit;
}
</style>
