<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['done'])

const LINES = [
  'INITIALIZING SYSTEM',
  'CHECKING LINK STATUS ......... OK',
  'LOADING PROFILE DATA ......... OK',
  'CONNECTION ESTABLISHED',
]

const shown = ref([])
const closing = ref(false)
let timers = []

function finish() {
  if (closing.value) return
  closing.value = true
  timers.push(setTimeout(() => emit('done'), 420))
}

onMounted(() => {
  // Anyone who prefers less motion never sees this at all.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('done')
    return
  }

  LINES.forEach((line, i) => {
    timers.push(setTimeout(() => shown.value.push(line), 160 + i * 260))
  })
  timers.push(setTimeout(finish, 160 + LINES.length * 260 + 320))

  window.addEventListener('keydown', finish)
  window.addEventListener('pointerdown', finish)
})

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  window.removeEventListener('keydown', finish)
  window.removeEventListener('pointerdown', finish)
})
</script>

<template>
  <!-- Decoration over content that is already in the DOM behind it. -->
  <div class="boot" :class="{ 'is-closing': closing }" aria-hidden="true">
    <div class="boot__inner">
      <p v-for="line in shown" :key="line" class="boot__line label">{{ line }}</p>
      <p class="boot__skip label">press any key to skip</p>
    </div>
  </div>
</template>

<style scoped>
.boot {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--void);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 400ms var(--ease);
}

.boot.is-closing {
  opacity: 0;
}

.boot__inner {
  width: min(420px, 82vw);
}

.boot__line {
  margin: 0 0 var(--s-2);
  color: var(--bone);
  animation: bootIn 220ms var(--ease) both;
}

.boot__line::before {
  content: '> ';
  color: var(--sig-text);
}

.boot__skip {
  margin: var(--s-4) 0 0;
  color: var(--bone-mute);
  letter-spacing: 0.16em;
  text-transform: lowercase;
  animation: blink 1.6s steps(2, end) infinite;
}

@keyframes bootIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes blink {
  50% {
    opacity: 0.25;
  }
}
</style>
