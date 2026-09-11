<script setup>
// Opens a section: a large index number, the title, a rule with a scanner
// light running along it, and a small system label at the end.
defineProps({
  id: { type: String, required: true },
  index: { type: String, required: true },
  title: { type: String, required: true },
  meta: { type: String, default: '' },
})
</script>

<template>
  <header v-reveal class="shead">
    <span class="shead__index" aria-hidden="true">{{ index }}</span>
    <h2 :id="id" class="shead__title">{{ title }}</h2>
    <span class="shead__rule" aria-hidden="true"></span>
    <span v-if="meta" class="label shead__meta">{{ meta }}</span>
  </header>
</template>

<style scoped>
.shead {
  display: flex;
  align-items: baseline;
  gap: clamp(12px, 2vw, 24px);
  margin-bottom: clamp(36px, 6vw, 72px);
}

.shead__index {
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--sig-text);
}

.shead__title {
  font-size: clamp(2.25rem, 5vw, 4rem);
  font-weight: 300;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
}

.shead__rule {
  position: relative;
  flex: 1;
  align-self: center;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-strong) 0 4px, transparent 4px 8px);
  overflow: hidden;
}

.shead__rule::after {
  content: '';
  position: absolute;
  top: 0;
  left: -20%;
  width: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--bone), transparent);
  animation: scanRule 3.6s var(--ease) infinite;
}

@keyframes scanRule {
  to {
    left: 100%;
  }
}

.shead__meta {
  color: var(--bone-mute);
  white-space: nowrap;
}

@media (max-width: 560px) {
  .shead__meta {
    display: none;
  }
}
</style>
