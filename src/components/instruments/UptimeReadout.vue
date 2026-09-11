<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Real uptime: how long this page has been open.
const startedAt = Date.now()
const elapsed = ref(0)
let timer = 0
onMounted(() => {
  timer = setInterval(() => (elapsed.value = Math.floor((Date.now() - startedAt) / 1000)), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const pad = (n) => String(n).padStart(2, '0')
const hms = computed(() => {
  const s = elapsed.value
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
})
// Twelve cells, one per five seconds of the current minute.
const filled = computed(() => Math.floor((elapsed.value % 60) / 5) + 1)
</script>

<template>
  <div class="inst uptime">
    <div class="inst__head">
      <span class="label">Uptime</span>
    </div>
    <span class="inst__value inst__value--lg">{{ hms }}</span>
    <span class="uptime__cells" aria-hidden="true">
      <i v-for="i in 12" :key="i" :class="{ 'is-on': i <= filled }"></i>
    </span>
  </div>
</template>

<style scoped>
.uptime__cells {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
  margin-top: auto;
}

.uptime__cells i {
  height: 6px;
  background: rgba(220, 216, 192, 0.12);
  transition: background-color var(--base) var(--ease);
}

.uptime__cells i.is-on {
  background: var(--bone);
}
</style>
