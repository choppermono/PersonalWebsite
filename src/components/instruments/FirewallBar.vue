<script setup>
// Firewall integrity. Intact until the hack is won; then the cells break red.
defineProps({
  breached: { type: Boolean, default: false },
})
</script>

<template>
  <div class="inst fw" :class="{ 'is-breached': breached }">
    <div class="inst__head">
      <span class="label">Firewall</span>
      <span class="fw__state">{{ breached ? 'Breached · 0%' : 'Intact · 100%' }}</span>
    </div>
    <div class="fw__cells" aria-hidden="true">
      <i v-for="i in 28" :key="i" :style="{ '--i': i }"></i>
    </div>
  </div>
</template>

<style scoped>
.fw__state {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--bone);
  font-variant-numeric: tabular-nums;
}

.fw.is-breached .fw__state {
  color: var(--sig-text);
}

.fw__cells {
  display: grid;
  grid-template-columns: repeat(28, 1fr);
  gap: 2px;
}

.fw__cells i {
  height: 9px;
  background: rgba(220, 216, 192, 0.75);
  clip-path: polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%);
  animation: fwWave 2.8s var(--ease) infinite;
  animation-delay: calc(var(--i) * 0.045s);
}

/* A bright pulse runs down the cells while intact. */
@keyframes fwWave {
  0%,
  70%,
  100% {
    background: rgba(220, 216, 192, 0.55);
  }
  8% {
    background: rgba(255, 252, 238, 1);
  }
}

.fw.is-breached .fw__cells i {
  animation: fwBroken 1.2s steps(2, end) infinite;
  animation-delay: calc(var(--i) * -0.13s);
  background: var(--sig-fill);
}

.fw.is-breached .fw__cells i:nth-child(3n) {
  background: rgba(188, 63, 60, 0.25);
}

@keyframes fwBroken {
  50% {
    opacity: 0.35;
  }
}
</style>
