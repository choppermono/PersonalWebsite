<script setup>
import { computed } from 'vue'

// The designation, plus a barcode drawn from its own bits — the same string
// always gives the same bars.
const props = defineProps({
  value: { type: String, required: true },
})

const bars = computed(() => {
  const out = []
  let x = 0
  const push = (w, on) => {
    if (on) out.push({ x, w })
    x += w
  }
  push(2, true)
  push(1, false)
  push(1, true)
  for (const ch of props.value) {
    const code = ch.charCodeAt(0)
    for (let b = 7; b >= 0; b--) {
      const bit = (code >> b) & 1
      push(bit ? 2 : 1, true)
      push(1, false)
    }
  }
  push(1, true)
  push(1, false)
  push(2, true)
  return { list: out, width: x }
})
</script>

<template>
  <div class="inst desig">
    <div class="inst__head">
      <span class="label">Designation</span>
    </div>
    <span class="inst__value inst__value--lg">{{ value }}</span>
    <svg
      class="desig__code"
      :viewBox="`0 0 ${bars.width} 10`"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect v-for="(b, i) in bars.list" :key="i" :x="b.x" y="0" :width="b.w" height="10" />
    </svg>
  </div>
</template>

<style scoped>
.desig__code {
  display: block;
  width: 100%;
  height: 16px;
  margin-top: auto;
  fill: var(--bone-dim);
}
</style>
