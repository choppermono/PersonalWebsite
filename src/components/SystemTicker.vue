<script setup>
import { computed } from 'vue'

// System chatter scrolling through the top bar. Decorative — aria-hidden, and
// it sits still for anyone who prefers reduced motion.
const props = defineProps({
  breached: { type: Boolean, default: false },
  nodes: { type: Number, default: 4 },
})

const messages = computed(() => [
  'Uplink stable',
  `${props.nodes} nodes reachable`,
  props.breached ? 'Firewall breached · integrity 0%' : 'Firewall intact · integrity 100%',
  'Core temperature nominal',
  'Hack module armed',
  'Sector 07 clear',
  'Holographic layer online',
  'Operator 0-H authenticated',
])
</script>

<template>
  <div class="ticker" aria-hidden="true">
    <div class="ticker__track">
      <span v-for="copy in 2" :key="copy" class="ticker__run">
        <span v-for="(m, i) in messages" :key="i" class="ticker__item">
          <i class="ticker__mark"></i>{{ m }}
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.ticker {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.ticker__track {
  display: flex;
  width: max-content;
  animation: tick 48s linear infinite;
}

.ticker__run {
  display: flex;
}

.ticker__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-right: 34px;
  font-family: var(--mono);
  font-size: 0.6875rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bone-dim);
  white-space: nowrap;
}

.ticker__mark {
  width: 5px;
  height: 5px;
  background: var(--sig-fill);
  transform: rotate(45deg);
}

/* Two identical runs: moving by one run's width loops seamlessly. */
@keyframes tick {
  to {
    transform: translateX(-50%);
  }
}
</style>
