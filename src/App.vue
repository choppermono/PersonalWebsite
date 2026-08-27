<script setup>
import { ref, computed } from 'vue'
import { accessPoints } from './data/profile.js'
import StarField from './components/StarField.vue'
import BootSequence from './components/BootSequence.vue'
import CursorReticle from './components/CursorReticle.vue'
import IdentPanel from './components/IdentPanel.vue'
import AccessNode from './components/AccessNode.vue'

const booting = ref(true)
const activeId = ref(accessPoints[0]?.id ?? null)

const activeNode = computed(
  () => accessPoints.find((n) => n.id === activeId.value) ?? accessPoints[0],
)

// Stable pseudo-random numbers per node, so the telemetry does not jitter on
// every render. Decorative — none of this measures anything.
function hash(input) {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

const telemetry = computed(() => {
  const node = activeNode.value
  if (!node) return null
  const h = hash(node.id)
  return {
    signal: 62 + (h % 38),
    vector: `${(h % 360).toString().padStart(3, '0')}.${(h % 90).toString().padStart(2, '0')}`,
    latency: `${8 + (h % 22)}ms`,
  }
})
</script>

<template>
  <StarField />

  <!-- Planetary limb: the station is looking down at something. -->
  <div class="limb" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
  <div class="scanlines" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>

  <CursorReticle />
  <BootSequence v-if="booting" @done="booting = false" />

  <div class="shell">
    <div class="frame">
      <span class="frame__corner frame__corner--tl" aria-hidden="true"></span>
      <span class="frame__corner frame__corner--tr" aria-hidden="true"></span>
      <span class="frame__corner frame__corner--bl" aria-hidden="true"></span>
      <span class="frame__corner frame__corner--br" aria-hidden="true"></span>

      <header class="topbar">
        <span class="label">Personal Terminal</span>
        <span class="topbar__rule" aria-hidden="true"></span>
        <span class="label">Sector 07 / Orbital</span>
      </header>

      <div class="console">
        <IdentPanel />

        <main class="access">
          <div class="access__head">
            <h2 class="access__title">Access Points</h2>
            <span class="label access__count">{{ accessPoints.length }} entries</span>
          </div>

          <ul class="access__list">
            <AccessNode
              v-for="(node, index) in accessPoints"
              :key="node.id"
              :node="node"
              :index="index"
              @engage="activeId = $event"
            />
          </ul>

          <aside v-if="telemetry" class="telemetry" aria-hidden="true">
            <div class="telemetry__block">
              <span class="label">Target</span>
              <span class="telemetry__value">{{ activeNode.label }}</span>
            </div>
            <div class="telemetry__block">
              <span class="label">Vector</span>
              <span class="telemetry__value">{{ telemetry.vector }}</span>
            </div>
            <div class="telemetry__block">
              <span class="label">Latency</span>
              <span class="telemetry__value">{{ telemetry.latency }}</span>
            </div>
            <div class="telemetry__block telemetry__block--wide">
              <span class="label">Signal</span>
              <span class="telemetry__bar">
                <span class="telemetry__fill" :style="{ width: telemetry.signal + '%' }"></span>
              </span>
            </div>
          </aside>
        </main>
      </div>

      <footer class="botbar">
        <span class="label">Halldor Andri Omarsson</span>
        <span class="botbar__rule" aria-hidden="true"></span>
        <span class="label">Built with Vue</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ---------- Background layers ---------- */

.limb {
  position: fixed;
  left: 50%;
  bottom: -212vh;
  width: 220vh;
  height: 220vh;
  min-width: 140vw;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 10%, rgba(220, 216, 192, 0.055), rgba(16, 15, 13, 0) 58%);
  box-shadow:
    inset 0 3px 0 0 rgba(220, 216, 192, 0.22),
    0 -30px 120px rgba(220, 216, 192, 0.05);
  pointer-events: none;
  z-index: 1;
}

.grain {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

.scanlines {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    rgba(220, 216, 192, 0.035) 0 1px,
    transparent 1px 3px
  );
}

.vignette {
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(16, 15, 13, 0) 42%, rgba(16, 15, 13, 0.82) 100%);
}

/* ---------- Frame ---------- */

.shell {
  position: relative;
  z-index: 10;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 4vw, 56px);
}

.frame {
  position: relative;
  width: 100%;
  max-width: 1180px;
  padding: clamp(20px, 3vw, 40px);
  border: 1px solid var(--line);
  background: rgba(16, 15, 13, 0.62);
  backdrop-filter: blur(3px);
  animation: frameIn var(--slow) var(--ease) both;
}

@keyframes frameIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.frame__corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 0 solid var(--bone);
}

.frame__corner--tl {
  top: -1px;
  left: -1px;
  border-top-width: 2px;
  border-left-width: 2px;
}
.frame__corner--tr {
  top: -1px;
  right: -1px;
  border-top-width: 2px;
  border-right-width: 2px;
}
.frame__corner--bl {
  bottom: -1px;
  left: -1px;
  border-bottom-width: 2px;
  border-left-width: 2px;
}
.frame__corner--br {
  bottom: -1px;
  right: -1px;
  border-bottom-width: 2px;
  border-right-width: 2px;
}

.topbar,
.botbar {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.topbar {
  margin-bottom: var(--s-4);
}

.botbar {
  margin-top: var(--s-4);
  padding-top: var(--s-3);
  border-top: 1px solid var(--line);
}

.topbar__rule,
.botbar__rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--line-strong), rgba(220, 216, 192, 0.05));
}

/* ---------- Console layout ---------- */

.console {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: clamp(16px, 2.5vw, 32px);
  align-items: start;
}

.access {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.access__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  padding-bottom: var(--s-2);
  border-bottom: 1px solid var(--line);
}

.access__title {
  font-size: clamp(1.375rem, 2.4vw, 1.75rem);
  font-weight: 300;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.access__count {
  color: var(--bone-mute);
}

.access__list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin: 0;
  padding: 0;
}

/* ---------- Telemetry ---------- */

.telemetry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-3);
  margin-top: var(--s-2);
  padding: var(--s-3) var(--s-4);
  border: 1px dashed var(--line);
}

.telemetry__block {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  min-width: 0;
}

.telemetry__block--wide {
  grid-column: 1 / -1;
}

.telemetry__value {
  font-family: var(--mono);
  font-size: 0.8125rem;
  color: var(--bone);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.telemetry__bar {
  display: block;
  height: 4px;
  background: rgba(220, 216, 192, 0.12);
}

.telemetry__fill {
  display: block;
  height: 100%;
  background: var(--bone);
  transition: width var(--base) var(--ease);
}

/* ---------- Responsive ---------- */

@media (max-width: 900px) {
  .console {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .telemetry {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .topbar .label:last-of-type,
  .botbar .label:last-of-type {
    display: none;
  }

  /* At 375px the tracked title and the count fight for the same line. */
  .access__head {
    align-items: center;
  }

  .access__title {
    font-size: 1.25rem;
    letter-spacing: 0.12em;
  }

  .access__count {
    white-space: nowrap;
  }
}
</style>
