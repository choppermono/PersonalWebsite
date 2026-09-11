<script setup>
import { ref, computed } from 'vue'
import HoloCanvas from './HoloCanvas.vue'
import DecryptText from './DecryptText.vue'
import NodeIcon from './NodeIcon.vue'
import { useTilt } from '../composables/useTilt.js'

const props = defineProps({
  node: { type: Object, required: true },
  index: { type: Number, required: true },
})
const emit = defineEmits(['engage'])

const root = ref(null)
const hot = ref(false)
const runs = ref(0)
const { move, reset } = useTilt(() => root.value, { max: 7 })

function engage() {
  if (!hot.value) runs.value += 1
  hot.value = true
  emit('engage', props.node.id)
}
function release() {
  hot.value = false
  reset()
}

// Stable decorative readouts per node, so they don't jitter between renders.
function hash(input) {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}
const h = hash(props.node.id)
const nodeId = `N-${String(props.index + 1).padStart(2, '0')}`
const signal = `SIG ${82 + (h % 17)}%`
const channel = `CH ${String(h % 97).padStart(2, '0')}.${h % 9}`
const holoState = computed(() => ({ hover: hot.value }))
</script>

<template>
  <li ref="root" class="term" :class="{ 'is-hot': hot }">
    <a
      class="term__link"
      :href="node.url"
      :target="node.external ? '_blank' : null"
      :rel="node.external ? 'noopener noreferrer' : null"
      @mouseenter="engage"
      @mousemove="move"
      @mouseleave="release"
      @focus="engage"
      @blur="release"
    >
      <span class="term__in" aria-hidden="true"></span>

      <span class="term__screen" :data-link-target="node.id" aria-hidden="true">
        <HoloCanvas :kind="node.holo" :state="holoState">
          <NodeIcon :name="node.icon" class="term__fallback" />
        </HoloCanvas>
        <span class="term__hud term__hud--tl">{{ nodeId }}</span>
        <span class="term__hud term__hud--tr">
          <NodeIcon :name="node.icon" class="term__hud-icon" />{{ node.kind }}
        </span>
        <span class="term__hud term__hud--bl">{{ signal }}</span>
        <span class="term__hud term__hud--br">{{ channel }}</span>
        <span class="term__sweep"></span>
      </span>

      <span class="term__body">
        <span class="term__title">
          <DecryptText :text="node.label" :trigger="runs" />
        </span>
        <span class="term__desc">{{ node.desc }}</span>
        <span class="term__host">{{ node.host }}</span>

        <span class="term__uplink" aria-hidden="true">
          <span class="term__uplink-state">{{ hot ? 'Linked' : 'Standby' }}</span>
          <span class="term__uplink-bar"><span></span></span>
          <span class="term__uplink-pct"></span>
        </span>

        <span class="term__cta">
          {{ node.cta }}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M7 17 17 7" />
            <path d="M9 7h8v8" />
          </svg>
        </span>
      </span>

      <span class="term__glare" aria-hidden="true"></span>
      <span v-if="node.external" class="sr-only">(opens in a new tab)</span>
    </a>
  </li>
</template>

<style scoped>
.term {
  --pct: 0;
  list-style: none;
  perspective: 1100px;
  min-width: 0;
  transition: --pct 900ms var(--ease);
}

.term.is-hot {
  --pct: 100;
}

/* Keyboard focus is drawn on the unclipped, untilted list item. */
.term:has(.term__link:focus-visible) {
  outline: 2px solid var(--sig-text);
  outline-offset: 4px;
}

.term__link {
  --cut: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--bone);
  /* The link's own background is the border: a line colour, with a light that
     runs round it while hot. The panel sits 1px inside. */
  background:
    conic-gradient(from var(--angle), transparent 0deg 250deg, rgba(240, 236, 216, 1) 320deg, transparent 360deg),
    linear-gradient(var(--line-strong), var(--line-strong));
  background-size: 100% 100%, 100% 100%;
  clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 450ms var(--ease);
  animation: trace 2.6s linear infinite paused;
}

.term__link:focus-visible {
  outline: none;
}

.term.is-hot .term__link {
  animation-play-state: running;
  transition-duration: 120ms;
}

.term__in {
  --cut-in: calc(var(--cut) - 0.5px);
  position: absolute;
  inset: 1px;
  background:
    repeating-linear-gradient(0deg, rgba(220, 216, 192, 0.018) 0 1px, transparent 1px 4px),
    linear-gradient(180deg, #1b1a14, #121110);
  clip-path: polygon(var(--cut-in) 0, 100% 0, 100% calc(100% - var(--cut-in)), calc(100% - var(--cut-in)) 100%, 0 100%, 0 var(--cut-in));
}

/* ---------- screen ---------- */

.term__screen {
  position: relative;
  display: block;
  height: 168px;
  margin: 10px 10px 0;
  background:
    linear-gradient(rgba(220, 216, 192, 0.05) 1px, transparent 1px) 0 0 / 100% 16px,
    linear-gradient(90deg, rgba(220, 216, 192, 0.05) 1px, transparent 1px) 0 0 / 16px 100%,
    radial-gradient(ellipse 80% 75% at 50% 70%, #1d1c16, #0a0908 80%);
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px);
  overflow: hidden;
}

.term__fallback {
  width: 44px;
  height: 44px;
  color: var(--bone-dim);
}

.term__hud {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bone-dim);
  pointer-events: none;
  z-index: 1;
}
.term__hud--tl {
  top: 8px;
  left: 16px;
  color: var(--bone);
}
.term__hud--tr {
  top: 8px;
  right: 10px;
  padding: 2px 6px;
  border: 1px solid var(--line-strong);
  background: rgba(11, 10, 8, 0.6);
}
.term__hud--bl {
  bottom: 8px;
  left: 10px;
}
.term__hud--br {
  bottom: 8px;
  right: 10px;
  font-variant-numeric: tabular-nums;
}

.term__hud-icon {
  width: 11px;
  height: 11px;
}

/* A bright line runs down the screen when the node is engaged. */
.term__sweep {
  position: absolute;
  left: 0;
  right: 0;
  top: -10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(240, 236, 216, 0.85), transparent);
  box-shadow: 0 0 12px rgba(240, 236, 216, 0.6);
  opacity: 0;
  pointer-events: none;
}

.term.is-hot .term__sweep {
  animation: sweepDown 1.1s var(--ease) both;
}

@keyframes sweepDown {
  0% {
    top: -4%;
    opacity: 1;
  }
  85% {
    opacity: 0.8;
  }
  100% {
    top: 104%;
    opacity: 0;
  }
}

/* ---------- body: the part that inverts on selection, like a NieR menu ---------- */

.term__body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 3px;
  margin: 0 10px 10px;
  padding: 14px 14px 14px;
  transition:
    background-color var(--fast) var(--ease),
    color var(--fast) var(--ease);
}

.term.is-hot .term__body {
  background: var(--bone);
  color: var(--void);
}

.term__title {
  font-family: var(--display);
  font-size: 1.625rem;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.term__desc {
  font-size: 0.875rem;
  color: var(--bone-dim);
  transition: color var(--fast) var(--ease);
}

.term__host {
  font-family: var(--mono);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  color: var(--bone-mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--fast) var(--ease);
}

.term.is-hot .term__desc {
  color: rgba(16, 15, 13, 0.82);
}

.term.is-hot .term__host {
  color: rgba(16, 15, 13, 0.62);
}

.term__uplink {
  display: grid;
  grid-template-columns: 5.5em 1fr 3.2em;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  font-family: var(--mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bone-mute);
  transition: color var(--fast) var(--ease);
}

.term.is-hot .term__uplink {
  color: rgba(16, 15, 13, 0.7);
}

.term__uplink-bar {
  height: 3px;
  background: rgba(220, 216, 192, 0.14);
}

.term.is-hot .term__uplink-bar {
  background: rgba(16, 15, 13, 0.15);
}

.term__uplink-bar > span {
  display: block;
  height: 100%;
  width: calc(var(--pct) * 1%);
  background: var(--sig-fill);
}

.term__uplink-pct {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.term__uplink-pct::after {
  counter-reset: pct var(--pct);
  content: counter(pct) '%';
}

.term__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font: 500 0.6875rem/1 var(--mono);
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.term__cta svg {
  width: 14px;
  height: 14px;
  transition: transform var(--base) var(--ease);
}

.term.is-hot .term__cta svg {
  transform: translate(3px, -3px);
}

/* ---------- glare that follows the pointer ---------- */

.term__glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgba(255, 250, 232, 0.14), transparent 42%);
  mix-blend-mode: screen;
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}

.term.is-hot .term__glare {
  opacity: 1;
}

@container matrix (max-width: 560px) {
  .term__screen {
    height: 150px;
  }

  .term__title {
    font-size: 1.375rem;
  }
}
</style>
