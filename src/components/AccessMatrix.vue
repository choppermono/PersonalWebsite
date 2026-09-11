<script setup>
import { ref, computed } from 'vue'
import AccessTerminal from './AccessTerminal.vue'
import UplinkStrip from './UplinkStrip.vue'

const props = defineProps({
  nodes: { type: Array, required: true },
  activeId: { type: String, default: null },
})
const emit = defineEmits(['engage'])

const active = computed(() => props.nodes.find((n) => n.id === props.activeId) ?? props.nodes[0])
const pulse = ref(0)

function engage(id) {
  if (id !== props.activeId) pulse.value += 1
  emit('engage', id)
}
</script>

<template>
  <main class="matrix" aria-labelledby="matrix-title">
    <div class="matrix__head">
      <h2 id="matrix-title" class="matrix__title">Access matrix</h2>
      <span class="matrix__scan" aria-hidden="true"></span>
      <span class="label matrix__count">{{ nodes.length }} nodes &middot; {{ nodes.length }} reachable</span>
    </div>

    <ul class="matrix__grid">
      <AccessTerminal
        v-for="(node, index) in nodes"
        :key="node.id"
        :node="node"
        :index="index"
        @engage="engage"
      />
    </ul>

    <UplinkStrip :node="active" :pulse="pulse" />
  </main>
</template>

<style scoped>
.matrix {
  container: matrix / inline-size;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.matrix__head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}

.matrix__title {
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  font-weight: 300;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* A thin scanner light travelling along the header rule. */
.matrix__scan {
  position: relative;
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-strong) 0 4px, transparent 4px 8px);
  overflow: hidden;
}

.matrix__scan::after {
  content: '';
  position: absolute;
  top: 0;
  left: -20%;
  width: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--bone), transparent);
  animation: scanRule 3.2s var(--ease) infinite;
}

@keyframes scanRule {
  to {
    left: 100%;
  }
}

.matrix__count {
  color: var(--bone-mute);
  white-space: nowrap;
}

/* Staggered bento: wide, narrow / narrow, wide. */
.matrix__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
}

.matrix__grid > :nth-child(4n + 1),
.matrix__grid > :nth-child(4n + 4) {
  grid-column: span 3;
}

.matrix__grid > :nth-child(4n + 2),
.matrix__grid > :nth-child(4n + 3) {
  grid-column: span 2;
}

@container matrix (max-width: 620px) {
  .matrix__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Same specificity as the span rules above, and later: it wins without !important. */
  .matrix__grid > :nth-child(n) {
    grid-column: auto;
  }
}

@container matrix (max-width: 460px) {
  .matrix__count {
    display: none;
  }
}
</style>
