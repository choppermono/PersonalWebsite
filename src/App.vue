<script setup>
import { ref, reactive, computed, watch, nextTick, provide } from 'vue'
import { accessPoints } from './data/profile.js'
import SpaceBackdrop from './components/SpaceBackdrop.vue'
import BootSequence from './components/BootSequence.vue'
import CursorReticle from './components/CursorReticle.vue'
import OperatorDossier from './components/OperatorDossier.vue'
import AccessMatrix from './components/AccessMatrix.vue'
import DataLink from './components/DataLink.vue'
import SystemTicker from './components/SystemTicker.vue'
import HackHud from './components/HackHud.vue'

const booting = ref(true)
const activeId = ref(accessPoints[0]?.id ?? null)
const activeNode = computed(() => accessPoints.find((n) => n.id === activeId.value) ?? accessPoints[0])

// ---------- holograms ----------
// One WebGL context draws every hologram on the page. three.js arrives in its
// own chunk after first paint; until then each slot shows its fallback.
const holo = import('./three/holo/index.js')
  .then(({ createHoloStage, views }) => ({ stage: createHoloStage(), views }))
  .catch((err) => {
    console.warn('Holograms unavailable, keeping the fallbacks.', err)
    return null
  })
provide('holo', holo)

// ---------- hack mode ----------

const backdrop = ref(null)
const ident = ref(null)
const threeReady = ref(false)
const threeOffline = ref(false)
const hacking = ref(false)
const breached = ref(false)
const glitching = ref(false)

const hud = reactive({ status: {}, banner: null, end: null, hitPulse: 0 })
let bannerTimer = 0
let glitchTimer = 0
let bannerId = 0

// The screen tear on each cut: [top %, height %, horizontal shift px].
// Fixed, so it reads as one designed moment rather than noise.
const SLICES = [
  [8, 3, -18],
  [19, 6, 26],
  [33, 2, -34],
  [47, 9, 14],
  [61, 4, -22],
  [74, 7, 30],
  [88, 3, -12],
]

// Nobody needs the holograms drawing behind the arena.
watch(hacking, async (on) => (await holo)?.stage.setPaused(on))

function startHack() {
  if (hacking.value || !threeReady.value) return
  Object.assign(hud, {
    status: { hp: 3, maxHp: 3, sector: 'Access', index: 1, sectors: 3, cores: 0, coresTotal: 4 },
    banner: null,
    end: null,
    hitPulse: 0,
  })
  hacking.value = true
  document.documentElement.classList.add('is-hacking')
  backdrop.value?.enterHack()
}

async function exitHack() {
  if (!hacking.value) return
  backdrop.value?.exitHack()
  hacking.value = false
  hud.banner = null
  hud.end = null
  clearTimeout(bannerTimer)
  document.documentElement.classList.remove('is-hacking')
  await nextTick()
  ident.value?.focusTrigger()
}

function retryHack() {
  hud.end = null
  backdrop.value?.restartHack()
}

function onGame(e) {
  if (e.type === 'state') {
    hud.status = { ...e }
  } else if (e.type === 'banner') {
    bannerId += 1
    hud.banner = { ...e, id: bannerId }
    clearTimeout(bannerTimer)
    bannerTimer = setTimeout(() => (hud.banner = null), 1700)
  } else if (e.type === 'hit') {
    hud.hitPulse += 1
  } else if (e.type === 'end') {
    hud.end = e
    if (e.result === 'complete') breached.value = true
  }
}

function onFlash() {
  glitching.value = true
  clearTimeout(glitchTimer)
  glitchTimer = setTimeout(() => (glitching.value = false), 460)
}
</script>

<template>
  <SpaceBackdrop
    ref="backdrop"
    :active="hacking"
    @ready="threeReady = true"
    @failed="threeOffline = true"
    @game="onGame"
    @flash="onFlash"
  />

  <!-- Planetary limb in CSS, until the 3D planet takes over. -->
  <div class="limb" :class="{ 'is-gone': threeReady }" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
  <div class="scanlines" aria-hidden="true"></div>
  <div class="vignette" :class="{ 'is-soft': hacking }" aria-hidden="true"></div>

  <CursorReticle />
  <BootSequence v-if="booting" @done="booting = false" />

  <div v-if="glitching" class="glitch" aria-hidden="true">
    <span
      v-for="([top, height, dx], i) in SLICES"
      :key="i"
      class="glitch__slice"
      :style="{ top: top + '%', height: height + '%', '--dx': dx + 'px' }"
    ></span>
  </div>

  <div class="shell" :class="{ 'is-away': hacking }" :inert="hacking ? '' : null">
    <div class="frame">
      <span class="frame__corner frame__corner--tl" aria-hidden="true"></span>
      <span class="frame__corner frame__corner--tr" aria-hidden="true"></span>
      <span class="frame__corner frame__corner--bl" aria-hidden="true"></span>
      <span class="frame__corner frame__corner--br" aria-hidden="true"></span>

      <DataLink v-if="!hacking" :target="activeId" />

      <header class="topbar">
        <span class="topbar__brand">
          <span class="topbar__glyph" aria-hidden="true"></span>
          <span class="label topbar__name">Halldor <span class="topbar__sep">//</span> Personal terminal</span>
        </span>
        <SystemTicker :breached="breached" :nodes="accessPoints.length" />
        <span class="label topbar__sector">Sector 07 / Orbital</span>
      </header>

      <div class="console">
        <OperatorDossier
          ref="ident"
          :target="activeId"
          :target-label="activeNode.label"
          :armed="threeReady"
          :offline="threeOffline"
          :breached="breached"
          :booted="!booting"
          @hack="startHack"
        />
        <AccessMatrix :nodes="accessPoints" :active-id="activeId" @engage="activeId = $event" />
      </div>

      <footer class="botbar">
        <span class="label">Halldor Andri Omarsson</span>
        <span class="botbar__rule" aria-hidden="true"></span>
        <span class="label botbar__keys">
          <span><kbd>Tab</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Connect</span>
          <span><kbd>Esc</kbd> Leave hack</span>
        </span>
        <span class="botbar__rule" aria-hidden="true"></span>
        <span class="label botbar__build">v3.0 &middot; Vue + three.js</span>
      </footer>
    </div>
  </div>

  <HackHud
    v-if="hacking"
    :status="hud.status"
    :banner="hud.banner"
    :end="hud.end"
    :hit-pulse="hud.hitPulse"
    @exit="exitHack"
    @retry="retryHack"
  />
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
  transition: opacity 900ms var(--ease);
}

.limb.is-gone {
  opacity: 0;
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
  transition: opacity 600ms var(--ease);
}

.vignette.is-soft {
  opacity: 0.5;
}

/* ---------- Frame ---------- */

.shell {
  position: relative;
  z-index: 10;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(14px, 3.5vw, 48px);
  /* Coming back from the arena, the page waits for the camera to start pulling out. */
  transition:
    opacity 600ms var(--ease) 450ms,
    transform 700ms var(--ease) 450ms,
    visibility 0s linear 0s;
}

.shell.is-away {
  opacity: 0;
  transform: scale(0.985);
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 240ms var(--ease),
    transform 400ms var(--ease),
    visibility 0s linear 400ms;
}

.frame {
  position: relative;
  width: 100%;
  max-width: 1300px;
  padding: clamp(16px, 2.6vw, 36px);
  border: 1px solid var(--line);
  background: rgba(16, 15, 13, 0.6);
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

/* ---------- Top and bottom bars ---------- */

.topbar,
.botbar {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.topbar {
  margin-bottom: clamp(16px, 2vw, 26px);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.topbar__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.topbar__glyph {
  width: 12px;
  height: 12px;
  background: var(--sig-fill);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 60% 100%, 0 100%);
  box-shadow: 0 0 10px var(--sig-fill);
}

.topbar__name {
  color: var(--bone);
}

.topbar__sep {
  color: var(--sig-text);
}

.topbar__sector {
  white-space: nowrap;
}

.botbar {
  margin-top: clamp(16px, 2vw, 26px);
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.botbar__rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--line-strong), rgba(220, 216, 192, 0.05));
}

.botbar__keys {
  display: inline-flex;
  gap: 16px;
  white-space: nowrap;
}

.botbar__keys span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.botbar__build {
  white-space: nowrap;
}

/* ---------- Console layout ---------- */

.console {
  display: grid;
  grid-template-columns: minmax(310px, 364px) minmax(0, 1fr);
  gap: clamp(20px, 3vw, 44px);
  align-items: start;
}

/* ---------- Glitch cut between orbit and arena ---------- */

/* One bone flash per cut — far under the three-flashes-per-second limit, and never red. */
.glitch {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
  overflow: hidden;
}

.glitch::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bone);
  animation: glitchFlash 460ms var(--ease) both;
}

.glitch__slice {
  position: absolute;
  left: -10%;
  width: 120%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(224, 87, 79, 0.55) 18%,
    rgba(220, 216, 192, 0.85) 46%,
    rgba(16, 15, 13, 0.95) 72%,
    transparent
  );
  animation: glitchSlice 460ms steps(5, end) both;
}

@keyframes glitchFlash {
  0% {
    opacity: 0;
  }
  22% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
  }
}

@keyframes glitchSlice {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  40% {
    transform: translateX(var(--dx));
  }
  70% {
    transform: translateX(calc(var(--dx) * -0.6));
    opacity: 0.8;
  }
  100% {
    transform: translateX(0);
    opacity: 0;
  }
}

/* ---------- Responsive ---------- */

@media (max-width: 1080px) {
  .botbar__keys,
  .botbar__keys + .botbar__rule {
    display: none;
  }
}

@media (max-width: 900px) {
  .console {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .topbar__sector,
  .botbar__build {
    display: none;
  }
}

/* On a phone the brand needs the whole bar; a sliver of ticker reads as a bug. */
@media (max-width: 560px) {
  .topbar :deep(.ticker) {
    display: none;
  }
}
</style>
