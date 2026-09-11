<script setup>
import { ref, reactive, computed, watch, nextTick, provide } from 'vue'
import { accessPoints } from './data/profile.js'
import SpaceBackdrop from './components/SpaceBackdrop.vue'
import BootSequence from './components/BootSequence.vue'
import CursorReticle from './components/CursorReticle.vue'
import SiteNav from './components/SiteNav.vue'
import HeroSection from './components/HeroSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import OperatorSection from './components/OperatorSection.vue'
import ContactSection from './components/ContactSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import HackHud from './components/HackHud.vue'

const booting = ref(true)
const activeId = ref(accessPoints[0]?.id ?? null)
const activeNode = computed(() => accessPoints.find((n) => n.id === activeId.value) ?? accessPoints[0])
const featured = accessPoints.filter((n) => n.feature)
const channels = accessPoints.filter((n) => !n.feature)

// Bumps whenever a different node is engaged; the uplink strip reacts to it.
const pulse = ref(0)
function engage(id) {
  if (id !== activeId.value) pulse.value += 1
  activeId.value = id
}

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
const hero = ref(null)
const nav = ref(null)
// Which trigger started the hack, so focus goes back to that one and the page
// doesn't jump to the hero when the hack was started from the nav.
let hackSource = 'hero'
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

function startHack(source = 'hero') {
  if (hacking.value || !threeReady.value) return
  hackSource = source
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
  const trigger = hackSource === 'nav' ? nav : hero
  trigger.value?.focusTrigger()
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

  <div class="site" :class="{ 'is-away': hacking }" :inert="hacking ? '' : null">
    <SiteNav ref="nav" :armed="threeReady" :offline="threeOffline" @hack="startHack('nav')" />

    <main>
      <HeroSection
        ref="hero"
        :target="activeId"
        :target-label="activeNode.label"
        :nodes="accessPoints.length"
        :armed="threeReady"
        :offline="threeOffline"
        :breached="breached"
        :booted="!booting"
        @hack="startHack('hero')"
      />
      <ProjectsSection :nodes="featured" @engage="engage" />
      <OperatorSection :breached="breached" :node="activeNode" :pulse="pulse" />
      <ContactSection :nodes="channels" @engage="engage" />
    </main>

    <SiteFooter />
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

/* ---------- Page ---------- */

.site {
  position: relative;
  z-index: 10;
  /* Coming back from the arena, the page waits for the camera to start pulling out.
     Opacity only: a transform here would unpin the fixed nav inside. */
  transition:
    opacity 600ms var(--ease) 450ms,
    visibility 0s linear 0s;
}

.site.is-away {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 240ms var(--ease),
    visibility 0s linear 400ms;
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
</style>
