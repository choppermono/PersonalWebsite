<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { identity } from '../data/profile.js'

const clock = ref('--:--:--')
let timer = null

function tick() {
  clock.value = new Date().toLocaleTimeString('de-CH', { hour12: false })
}

// Flavour only — regenerated on every load, means nothing.
const session = Array.from({ length: 6 }, () =>
  Math.floor(Math.random() * 16).toString(16).toUpperCase(),
).join('')

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="ident">
    <div class="ident__emblem" aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" focusable="false">
        <circle cx="60" cy="60" r="52" stroke-width="1" opacity="0.35" />
        <circle cx="60" cy="60" r="40" stroke-width="1" opacity="0.6" />
        <rect x="34" y="34" width="52" height="52" stroke-width="1.2" transform="rotate(45 60 60)" />
        <rect x="46" y="46" width="28" height="28" stroke-width="1.2" />
        <path d="M60 4v20M60 96v20M4 60h20M96 60h20" stroke-width="1" opacity="0.55" />
        <circle cx="60" cy="60" r="6" fill="currentColor" stroke="none" />
        <g class="ident__ring">
          <circle cx="60" cy="60" r="52" stroke-width="1.4" stroke-dasharray="14 90" />
        </g>
      </svg>
    </div>

    <h1 class="ident__handle">{{ identity.handle }}</h1>
    <p class="ident__operator">{{ identity.operator }}</p>

    <dl class="ident__readout">
      <div class="ident__row">
        <dt class="label">Status</dt>
        <dd class="ident__value">
          <span class="ident__pulse" aria-hidden="true"></span>Online
        </dd>
      </div>
      <div class="ident__row">
        <dt class="label">Local time</dt>
        <dd class="ident__value">{{ clock }}</dd>
      </div>
      <div class="ident__row">
        <dt class="label">Designation</dt>
        <dd class="ident__value">{{ identity.designation }}</dd>
      </div>
      <div class="ident__row">
        <dt class="label">Session</dt>
        <dd class="ident__value">{{ session }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.ident {
  position: relative;
  padding: var(--s-5) var(--s-4);
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(220, 216, 192, 0.045), rgba(220, 216, 192, 0.01));
  text-align: center;
}

.ident__emblem {
  width: 132px;
  height: 132px;
  margin: 0 auto var(--s-4);
  color: var(--bone);
}

.ident__emblem svg {
  width: 100%;
  height: 100%;
}

.ident__ring {
  transform-origin: 60px 60px;
  animation: spin 22s linear infinite;
  color: var(--sig-fill);
  stroke: var(--sig-fill);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ident__handle {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 300;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: var(--s-2);
}

.ident__operator {
  margin: 0 0 var(--s-5);
  font-size: 0.9375rem;
  color: var(--bone-dim);
  letter-spacing: 0.04em;
}

.ident__readout {
  margin: 0;
  padding-top: var(--s-3);
  border-top: 1px solid var(--line);
  text-align: left;
}

.ident__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-2) 0;
  border-bottom: 1px dashed rgba(220, 216, 192, 0.12);
}

.ident__row:last-child {
  border-bottom: 0;
}

.ident__row dt {
  margin: 0;
}

.ident__value {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.8125rem;
  color: var(--bone);
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.ident__pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sig-fill);
  box-shadow: 0 0 8px var(--sig-fill);
  animation: pulse 2.4s var(--ease) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
</style>
