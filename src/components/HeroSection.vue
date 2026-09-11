<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { identity } from '../data/profile.js'
import HoloCanvas from './HoloCanvas.vue'
import DecryptText from './DecryptText.vue'
import HackButton from './HackButton.vue'
import SystemTicker from './SystemTicker.vue'

// The first screen: the core floating free in orbit, the name under it, the
// hack trigger, and a ticker band that closes the hero off from the page.
const props = defineProps({
  target: { type: String, default: null },
  targetLabel: { type: String, default: '' },
  nodes: { type: Number, default: 4 },
  armed: { type: Boolean, default: false },
  offline: { type: Boolean, default: false },
  breached: { type: Boolean, default: false },
  booted: { type: Boolean, default: false },
})
const emit = defineEmits(['hack'])

const hackBtn = ref(null)
const hover = ref(false)
const lockAt = ref(0)
const chargeAt = ref(0)
const nameRun = ref(0)

watch(
  () => props.target,
  (id, prev) => {
    if (id && prev && id !== prev) lockAt.value = performance.now()
  },
)
// The name decrypts once the boot screen has lifted, so it is actually seen.
watch(
  () => props.booted,
  (on) => on && (nameRun.value += 1),
  { immediate: true },
)

const coreState = computed(() => ({
  hover: hover.value,
  lockAt: lockAt.value,
  chargeAt: chargeAt.value,
  breached: props.breached,
}))

function activate() {
  if (!props.armed) return
  chargeAt.value = performance.now()
  emit('hack')
}

// A fluctuating sync figure for the hologram HUD. Decorative.
const sync = ref('99.7')
let syncTimer = 0
onMounted(() => {
  syncTimer = setInterval(() => (sync.value = (98.6 + Math.random() * 1.3).toFixed(1)), 1400)
})
onBeforeUnmount(() => clearInterval(syncTimer))

defineExpose({ focusTrigger: () => hackBtn.value?.focus() })
</script>

<template>
  <section id="top" class="hero" aria-labelledby="hero-name">
    <div class="hero__main wrap">
      <div class="hero__stage" @pointerenter="hover = true" @pointerleave="hover = false">
        <HoloCanvas kind="core" :state="coreState" @activate="activate">
          <svg class="hero__fallback" viewBox="0 0 120 120" fill="none" stroke="currentColor" focusable="false">
            <circle cx="60" cy="60" r="52" stroke-width="1" opacity="0.35" />
            <circle cx="60" cy="60" r="40" stroke-width="1" opacity="0.6" />
            <rect x="34" y="34" width="52" height="52" stroke-width="1.2" transform="rotate(45 60 60)" />
            <rect x="46" y="46" width="28" height="28" stroke-width="1.2" />
            <path d="M60 4v20M60 96v20M4 60h20M96 60h20" stroke-width="1" opacity="0.55" />
            <circle cx="60" cy="60" r="6" fill="currentColor" stroke="none" />
          </svg>
        </HoloCanvas>

        <div class="hud" aria-hidden="true">
          <span class="hud__corner hud__corner--tl"></span>
          <span class="hud__corner hud__corner--tr"></span>
          <span class="hud__corner hud__corner--bl"></span>
          <span class="hud__corner hud__corner--br"></span>
          <span class="hud__tag hud__tag--tl">Core.sys</span>
          <span class="hud__tag hud__tag--tr">Sync {{ sync }}%</span>
          <span class="hud__tag hud__tag--bl">Lock &rsaquo; {{ targetLabel }}</span>
          <span class="hud__tag hud__tag--br" :class="{ 'is-red': breached }">
            {{ breached ? 'Breach' : 'Nominal' }}
          </span>
          <span class="hud__hint">Drag to rotate</span>
        </div>
      </div>

      <div class="hero__id">
        <span class="label hero__kicker">
          <span class="hero__kicker-mark" aria-hidden="true"></span>
          Operator &middot; {{ identity.designation }}
        </span>
        <h1 id="hero-name" class="hero__name" :data-text="identity.handle">
          <DecryptText :text="identity.handle" :trigger="nameRun" :steps="20" :step-ms="38" />
        </h1>
        <p class="hero__operator">{{ identity.operator }}</p>
        <div class="hero__action">
          <HackButton ref="hackBtn" :armed="armed" :offline="offline" @hack="activate" />
        </div>
      </div>
    </div>

    <a href="#projects" class="hero__cue">
      <span class="label">Scroll</span>
      <span class="hero__cue-line" aria-hidden="true"><span></span></span>
    </a>

    <div class="hero__band">
      <SystemTicker :breached="breached" :nodes="nodes" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  padding-top: var(--nav-h);
}

.hero__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2vh, 20px);
  padding-block: clamp(12px, 3vh, 36px);
}

/* ---------- hologram stage: no panel, the core floats in open space ---------- */

.hero__stage {
  position: relative;
  width: min(100%, 620px);
  height: clamp(250px, 46svh, 500px);
}

.hero__stage :deep(canvas) {
  cursor: grab;
}

.hero__stage :deep(canvas:active) {
  cursor: grabbing;
}

.hero__fallback {
  width: 160px;
  height: 160px;
  color: var(--bone);
}

.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hud__corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 0 solid var(--bone);
  opacity: 0.8;
}
.hud__corner--tl {
  top: 0;
  left: 0;
  border-top-width: 1px;
  border-left-width: 1px;
}
.hud__corner--tr {
  top: 0;
  right: 0;
  border-top-width: 1px;
  border-right-width: 1px;
}
.hud__corner--bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 1px;
  border-left-width: 1px;
}
.hud__corner--br {
  bottom: 0;
  right: 0;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.hud__tag {
  position: absolute;
  font-family: var(--mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bone-dim);
  white-space: nowrap;
  max-width: 44%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hud__tag--tl {
  top: 4px;
  left: 24px;
}
.hud__tag--tr {
  top: 4px;
  right: 24px;
  font-variant-numeric: tabular-nums;
}
.hud__tag--bl {
  bottom: 4px;
  left: 24px;
}
.hud__tag--br {
  bottom: 4px;
  right: 24px;
}
.hud__tag.is-red {
  color: var(--sig-text);
}

.hud__hint {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  font-family: var(--mono);
  font-size: 0.5625rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(220, 216, 192, 0.45);
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}

.hero__stage:hover .hud__hint {
  opacity: 1;
}

/* ---------- identity ---------- */

.hero__id {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.hero__kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--bone-mute);
}

.hero__kicker-mark {
  width: 8px;
  height: 8px;
  background: var(--sig-fill);
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.hero__name {
  position: relative;
  font-size: clamp(2.5rem, 6.2vw, 5.75rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-wrap: balance;
  margin-right: -0.12em;
  text-shadow: 0 0 32px rgba(220, 216, 192, 0.22);
}

/* Glitch bursts: two offset copies, sliced, a few frames every few seconds. */
.hero__name::before,
.hero__name::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  pointer-events: none;
  clip-path: inset(0 0 100% 0);
}

.hero__name::before {
  color: var(--sig-text);
  animation: glitchA 7s steps(1, end) infinite 3s;
}

.hero__name::after {
  color: #fffbe8;
  animation: glitchB 7s steps(1, end) infinite 3.05s;
}

@keyframes glitchA {
  0%,
  92% {
    clip-path: inset(0 0 100% 0);
    transform: none;
  }
  93% {
    clip-path: inset(12% 0 64% 0);
    transform: translate(-5px, 0);
  }
  94.5% {
    clip-path: inset(58% 0 18% 0);
    transform: translate(4px, 0);
  }
  96% {
    clip-path: inset(82% 0 4% 0);
    transform: translate(-2px, 0);
  }
  97% {
    clip-path: inset(0 0 100% 0);
  }
}

@keyframes glitchB {
  0%,
  92% {
    clip-path: inset(0 0 100% 0);
    transform: none;
  }
  93.5% {
    clip-path: inset(40% 0 42% 0);
    transform: translate(5px, 0);
  }
  95% {
    clip-path: inset(6% 0 80% 0);
    transform: translate(-3px, 0);
  }
  96.5% {
    clip-path: inset(0 0 100% 0);
  }
}

.hero__operator {
  margin: 0;
  font-size: clamp(0.9375rem, 1.4vw, 1.125rem);
  letter-spacing: 0.08em;
  color: var(--bone-dim);
}

.hero__action {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: clamp(8px, 1.6vh, 18px);
}

/* ---------- scroll cue ---------- */

.hero__cue {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  align-self: center;
  min-width: 44px;
  padding: 6px 12px 14px;
}

.hero__cue .label {
  color: var(--bone-mute);
  transition: color var(--fast) var(--ease);
}

.hero__cue:hover .label {
  color: var(--bone);
}

.hero__cue-line {
  position: relative;
  width: 1px;
  height: 38px;
  background: var(--line);
  overflow: hidden;
}

.hero__cue-line > span {
  position: absolute;
  left: 0;
  top: -40%;
  width: 1px;
  height: 40%;
  background: var(--bone);
  animation: cueDrop 2.2s var(--ease) infinite;
}

@keyframes cueDrop {
  to {
    top: 100%;
  }
}

/* ---------- ticker band: edge to edge, closes the hero ---------- */

.hero__band {
  display: flex;
  align-items: center;
  height: 44px;
  border-block: 1px solid var(--line);
  background: rgba(16, 15, 13, 0.55);
  backdrop-filter: blur(4px);
}

@media (max-width: 560px) {
  .hud__tag--bl,
  .hud__tag--tr {
    display: none;
  }
}
</style>
