<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { identity } from '../data/profile.js'
import HoloCanvas from './HoloCanvas.vue'
import DecryptText from './DecryptText.vue'
import ClockDial from './instruments/ClockDial.vue'
import StatusScope from './instruments/StatusScope.vue'
import UptimeReadout from './instruments/UptimeReadout.vue'
import HexDump from './instruments/HexDump.vue'
import DesignationCode from './instruments/DesignationCode.vue'
import FirewallBar from './instruments/FirewallBar.vue'

const props = defineProps({
  target: { type: String, default: null },
  targetLabel: { type: String, default: '' },
  armed: { type: Boolean, default: false },
  offline: { type: Boolean, default: false },
  breached: { type: Boolean, default: false },
  booted: { type: Boolean, default: false },
})
const emit = defineEmits(['hack'])

const trigger = ref(null)
const hover = ref(false)
const lockAt = ref(0)
const chargeAt = ref(0)
const nameRun = ref(0)

// Flavour only — regenerated on every load, means nothing.
const session = Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')

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

defineExpose({ focusTrigger: () => trigger.value?.focus() })
</script>

<template>
  <section class="dossier" aria-labelledby="dossier-name">
    <div class="dossier__in">
      <header class="dossier__head">
        <span class="dossier__glyph" aria-hidden="true"></span>
        <span class="label">Operator dossier</span>
        <span class="dossier__rule" aria-hidden="true"></span>
        <span class="label dossier__file">File 0-H</span>
      </header>

      <div
        class="dossier__holo"
        data-link-source
        @pointerenter="hover = true"
        @pointerleave="hover = false"
      >
        <HoloCanvas kind="core" :state="coreState" @activate="activate">
          <svg class="dossier__fallback" viewBox="0 0 120 120" fill="none" stroke="currentColor" focusable="false">
            <circle cx="60" cy="60" r="52" stroke-width="1" opacity="0.35" />
            <circle cx="60" cy="60" r="40" stroke-width="1" opacity="0.6" />
            <rect x="34" y="34" width="52" height="52" stroke-width="1.2" transform="rotate(45 60 60)" />
            <rect x="46" y="46" width="28" height="28" stroke-width="1.2" />
            <path d="M60 4v20M60 96v20M4 60h20M96 60h20" stroke-width="1" opacity="0.55" />
            <circle cx="60" cy="60" r="6" fill="currentColor" stroke="none" />
          </svg>
        </HoloCanvas>

        <div class="holo-hud" aria-hidden="true">
          <span class="holo-hud__corner holo-hud__corner--tl"></span>
          <span class="holo-hud__corner holo-hud__corner--tr"></span>
          <span class="holo-hud__corner holo-hud__corner--bl"></span>
          <span class="holo-hud__corner holo-hud__corner--br"></span>
          <span class="holo-hud__tag holo-hud__tag--tl">Core.sys</span>
          <span class="holo-hud__tag holo-hud__tag--tr">Sync {{ sync }}%</span>
          <span class="holo-hud__tag holo-hud__tag--bl">Lock &rsaquo; {{ targetLabel }}</span>
          <span class="holo-hud__tag holo-hud__tag--br" :class="{ 'is-red': breached }">
            {{ breached ? 'Breach' : 'Nominal' }}
          </span>
          <span class="holo-hud__hint">Drag to rotate</span>
        </div>
      </div>

      <div class="dossier__action">
        <button v-if="armed" ref="trigger" type="button" class="hackbtn" @click="activate">
          <span class="hackbtn__fill" aria-hidden="true"></span>
          <span class="hackbtn__mark" aria-hidden="true"></span>
          <span class="hackbtn__label">Initiate hack</span>
          <span class="hackbtn__meta" aria-hidden="true">4 cores</span>
        </button>
        <span v-else class="label dossier__module">Hack module &middot; {{ offline ? 'offline' : 'loading' }}</span>
      </div>

      <div class="dossier__id">
        <span class="label dossier__kicker">Operator</span>
        <h1 id="dossier-name" class="dossier__name" :data-text="identity.handle">
          <DecryptText :text="identity.handle" :trigger="nameRun" :steps="20" :step-ms="38" />
        </h1>
        <p class="dossier__operator">{{ identity.operator }}</p>
      </div>

      <div class="dossier__grid">
        <ClockDial class="is-wide" />
        <StatusScope :breached="breached" />
        <UptimeReadout />
        <HexDump :session="session" />
        <DesignationCode :value="identity.designation" />
        <FirewallBar class="is-wide" :breached="breached" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The outer layer is the border: its background shows through a 1px gap
   around the clipped inner panel, and a light runs round it on a loop. */
.dossier {
  --cut: 18px;
  position: relative;
  padding: 1px;
  background:
    conic-gradient(from var(--angle), transparent 0deg 290deg, rgba(236, 232, 212, 0.95) 330deg, transparent 360deg),
    linear-gradient(var(--line-strong), var(--line-strong));
  clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
  animation: trace 8s linear infinite;
}

.dossier__in {
  --cut-in: calc(var(--cut) - 0.5px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 16px 18px;
  background:
    repeating-linear-gradient(0deg, rgba(220, 216, 192, 0.018) 0 1px, transparent 1px 4px),
    linear-gradient(180deg, #1b1a14 0%, #121110 100%);
  clip-path: polygon(var(--cut-in) 0, 100% 0, 100% calc(100% - var(--cut-in)), calc(100% - var(--cut-in)) 100%, 0 100%, 0 var(--cut-in));
}

.dossier__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dossier__glyph {
  width: 10px;
  height: 10px;
  background: var(--sig-fill);
  clip-path: polygon(0 0, 100% 0, 0 100%);
}

.dossier__rule {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-strong) 0 6px, transparent 6px 10px);
}

.dossier__file {
  color: var(--bone-mute);
}

/* ---------- hologram window ---------- */

.dossier__holo {
  position: relative;
  height: 268px;
  margin: 0 -4px;
  background:
    radial-gradient(ellipse 70% 60% at 50% 62%, rgba(220, 216, 192, 0.07), transparent 70%),
    linear-gradient(180deg, rgba(11, 10, 8, 0.2), rgba(11, 10, 8, 0.65));
  border: 1px solid rgba(220, 216, 192, 0.1);
  overflow: hidden;
}

.dossier__fallback {
  width: 132px;
  height: 132px;
  color: var(--bone);
}

.holo-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.holo-hud__corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 0 solid var(--bone);
}
.holo-hud__corner--tl {
  top: 6px;
  left: 6px;
  border-top-width: 1px;
  border-left-width: 1px;
}
.holo-hud__corner--tr {
  top: 6px;
  right: 6px;
  border-top-width: 1px;
  border-right-width: 1px;
}
.holo-hud__corner--bl {
  bottom: 6px;
  left: 6px;
  border-bottom-width: 1px;
  border-left-width: 1px;
}
.holo-hud__corner--br {
  bottom: 6px;
  right: 6px;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.holo-hud__tag {
  position: absolute;
  font-family: var(--mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bone-dim);
  white-space: nowrap;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.holo-hud__tag--tl {
  top: 10px;
  left: 24px;
}
.holo-hud__tag--tr {
  top: 10px;
  right: 24px;
  font-variant-numeric: tabular-nums;
}
.holo-hud__tag--bl {
  bottom: 10px;
  left: 24px;
}
.holo-hud__tag--br {
  bottom: 10px;
  right: 24px;
}
.holo-hud__tag.is-red {
  color: var(--sig-text);
}

.holo-hud__hint {
  position: absolute;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  font-family: var(--mono);
  font-size: 0.5625rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(220, 216, 192, 0.45);
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}

.dossier__holo:hover .holo-hud__hint {
  opacity: 1;
}

.dossier__holo :deep(canvas) {
  cursor: grab;
}

.dossier__holo :deep(canvas:active) {
  cursor: grabbing;
}

/* ---------- hack button ---------- */

.dossier__action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.hackbtn {
  --c: 10px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  font: 500 0.75rem/1 var(--mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--bone);
  background:
    repeating-linear-gradient(-45deg, rgba(220, 216, 192, 0.05) 0 6px, transparent 6px 12px),
    rgba(16, 15, 13, 0.7);
  border: 0;
  box-shadow: inset 0 0 0 1px var(--line-strong);
  clip-path: polygon(var(--c) 0, 100% 0, 100% calc(100% - var(--c)), calc(100% - var(--c)) 100%, 0 100%, 0 var(--c));
  cursor: pointer;
  overflow: hidden;
  transition: color var(--fast) var(--ease);
}

.hackbtn__fill {
  position: absolute;
  inset: 0;
  background: var(--bone);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 420ms var(--ease);
}

.hackbtn__mark,
.hackbtn__label,
.hackbtn__meta {
  position: relative;
  white-space: nowrap;
}

.hackbtn__mark {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid var(--sig-fill);
}

.hackbtn__meta {
  margin-left: auto;
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  color: var(--bone-mute);
  transition: color var(--fast) var(--ease);
}

.hackbtn:hover,
.hackbtn:focus-visible {
  color: var(--void);
}

.hackbtn:hover .hackbtn__fill,
.hackbtn:focus-visible .hackbtn__fill {
  transform: scaleX(1);
}

.hackbtn:hover .hackbtn__meta,
.hackbtn:focus-visible .hackbtn__meta {
  color: rgba(16, 15, 13, 0.65);
}

/* clip-path would cut an outline off, so focus is drawn inside the shape */
.hackbtn:focus-visible {
  outline: none;
}
.hackbtn:focus-visible::after {
  content: '';
  position: absolute;
  inset: 3px;
  border: 2px solid var(--sig-fill);
}

.dossier__module {
  color: var(--bone-mute);
}

/* ---------- identity ---------- */

.dossier__id {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.dossier__kicker {
  color: var(--bone-mute);
}

.dossier__name {
  position: relative;
  font-size: clamp(2rem, 4.2vw, 2.75rem);
  font-weight: 300;
  line-height: 1.02;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-wrap: balance;
  margin-right: -0.14em;
  text-shadow: 0 0 22px rgba(220, 216, 192, 0.22);
}

/* Glitch bursts: two offset copies, sliced, a few frames every few seconds. */
.dossier__name::before,
.dossier__name::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  pointer-events: none;
  clip-path: inset(0 0 100% 0);
}

.dossier__name::before {
  color: var(--sig-text);
  animation: glitchA 7s steps(1, end) infinite 3s;
}

.dossier__name::after {
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
    transform: translate(-4px, 0);
  }
  94.5% {
    clip-path: inset(58% 0 18% 0);
    transform: translate(3px, 0);
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
    transform: translate(4px, 0);
  }
  95% {
    clip-path: inset(6% 0 80% 0);
    transform: translate(-3px, 0);
  }
  96.5% {
    clip-path: inset(0 0 100% 0);
  }
}

.dossier__operator {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--bone-dim);
  letter-spacing: 0.04em;
}

/* ---------- instruments: hairline-separated tiles ---------- */

.dossier__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}

.dossier__grid > .is-wide {
  grid-column: 1 / -1;
}
</style>
