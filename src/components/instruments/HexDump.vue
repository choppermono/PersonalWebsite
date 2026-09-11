<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// The session id above a memory dump that keeps scrolling. The dump is
// texture: aria-hidden, random, and it stops under reduced motion.
defineProps({
  session: { type: String, required: true },
})

const BYTES = 6
const hex = (n, len) => n.toString(16).toUpperCase().padStart(len, '0')
let offset = 0x00a0
const makeRow = () => {
  const row = {
    off: hex(offset, 4),
    bytes: Array.from({ length: BYTES }, () => hex(Math.floor(Math.random() * 256), 2)),
    hot: Math.random() < 0.6 ? Math.floor(Math.random() * BYTES) : -1,
  }
  offset = (offset + BYTES) & 0xffff
  return row
}

const rows = ref(Array.from({ length: 4 }, makeRow))
let timer = 0

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (document.hidden) return
    rows.value = [...rows.value.slice(1), makeRow()]
  }, 160)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="inst hex">
    <div class="inst__head">
      <span class="label">Session</span>
      <span class="inst__value">{{ session }}</span>
    </div>
    <div class="hex__dump" aria-hidden="true">
      <div v-for="r in rows" :key="r.off" class="hex__row">
        <span class="hex__off">{{ r.off }}</span>
        <span v-for="(b, i) in r.bytes" :key="i" :class="{ 'is-hot': i === r.hot }">{{ b }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hex__dump {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-family: var(--mono);
  font-size: 0.625rem;
  line-height: 1.35;
  color: var(--bone-mute);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
}

.hex__row {
  display: flex;
  gap: 0.55em;
  white-space: nowrap;
}

.hex__row:last-child {
  color: var(--bone-dim);
}

.hex__off {
  color: rgba(220, 216, 192, 0.38);
  margin-right: 0.2em;
}

.is-hot {
  color: var(--sig-text);
}
</style>
