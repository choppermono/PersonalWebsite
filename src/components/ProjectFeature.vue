<script setup>
import { ref, computed } from 'vue'
import HoloCanvas from './HoloCanvas.vue'
import DecryptText from './DecryptText.vue'
import NodeIcon from './NodeIcon.vue'
import { useTilt } from '../composables/useTilt.js'

// One project as a full-width block: a large hologram screen on one side, the
// story on the other. Alternating blocks swap sides.
const props = defineProps({
  node: { type: Object, required: true },
  index: { type: Number, required: true },
  reverse: { type: Boolean, default: false },
})
const emit = defineEmits(['engage'])

const screen = ref(null)
const hot = ref(false)
const runs = ref(0)
const { move, reset } = useTilt(() => screen.value, { max: 5 })

function engage() {
  if (!hot.value) runs.value += 1
  hot.value = true
  emit('engage', props.node.id)
}
function release(e) {
  // Focus moving between elements inside the block is not leaving it.
  if (e?.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
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
const number = String(props.index + 1).padStart(2, '0')
const signal = `SIG ${82 + (h % 17)}%`
const channel = `CH ${String(h % 97).padStart(2, '0')}.${h % 9}`
const holoState = computed(() => ({ hover: hot.value }))
const titleId = `feat-${props.node.id}`
</script>

<template>
  <article
    class="feat"
    :class="{ 'is-rev': reverse, 'is-hot': hot }"
    :aria-labelledby="titleId"
    @mouseenter="engage"
    @mouseleave="release"
    @focusin="engage"
    @focusout="release"
  >
    <span class="feat__ghost" aria-hidden="true">{{ number }}</span>

    <div v-reveal class="feat__media">
      <a
        ref="screen"
        class="feat__screen"
        :href="node.url"
        :target="node.external ? '_blank' : null"
        :rel="node.external ? 'noopener noreferrer' : null"
        tabindex="-1"
        aria-hidden="true"
        @mousemove="move"
      >
        <span class="feat__glass">
          <HoloCanvas :kind="node.holo" :state="holoState">
            <NodeIcon :name="node.icon" class="feat__fallback" />
          </HoloCanvas>
          <span class="feat__hud feat__hud--tl">N-{{ number }}</span>
          <span class="feat__hud feat__hud--tr"><NodeIcon :name="node.icon" class="feat__hud-icon" />{{ node.kind }}</span>
          <span class="feat__hud feat__hud--bl">{{ signal }}</span>
          <span class="feat__hud feat__hud--br">{{ channel }}</span>
          <span class="feat__sweep"></span>
          <span class="feat__glare"></span>
        </span>
      </a>
    </div>

    <div v-reveal="140" class="feat__body">
      <span class="label feat__kicker">
        <span class="feat__kicker-num">{{ number }}</span>
        <span class="feat__kicker-rule" aria-hidden="true"></span>
        {{ node.kind }}
      </span>

      <h3 :id="titleId" class="feat__title">
        <DecryptText :text="node.label" :trigger="runs" />
      </h3>

      <p class="feat__blurb">{{ node.feature.blurb }}</p>

      <dl class="feat__facts">
        <div v-for="[value, label] in node.feature.facts" :key="label" class="feat__fact">
          <dt class="label">{{ label }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>

      <ul class="feat__stack" aria-label="Built with">
        <li v-for="tech in node.feature.stack" :key="tech">{{ tech }}</li>
      </ul>

      <div class="feat__uplink" aria-hidden="true">
        <span>{{ hot ? 'Linked' : 'Standby' }}</span>
        <span class="feat__uplink-bar"><span></span></span>
        <span class="feat__uplink-pct"></span>
      </div>

      <div class="feat__actions">
        <a
          class="cmd"
          :href="node.url"
          :target="node.external ? '_blank' : null"
          :rel="node.external ? 'noopener noreferrer' : null"
        >
          <span class="cmd__fill" aria-hidden="true"></span>
          <span>{{ node.cta }}</span>
          <svg class="cmd__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M7 17 17 7" />
            <path d="M9 7h8v8" />
          </svg>
          <span v-if="node.external" class="sr-only">(opens in a new tab)</span>
        </a>
        <span class="feat__host">{{ node.host }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.feat {
  --pct: 0;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: center;
  transition: --pct 900ms var(--ease);
}

.feat.is-hot {
  --pct: 100;
}

.feat.is-rev {
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
}

.feat.is-rev .feat__media {
  order: 2;
}

/* A huge outlined number behind the story side. Pure decoration. */
.feat__ghost {
  position: absolute;
  top: -0.62em;
  right: -0.04em;
  font-family: var(--display);
  font-size: clamp(8rem, 20vw, 17rem);
  font-weight: 300;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px rgba(220, 216, 192, 0.08);
  pointer-events: none;
  user-select: none;
}

.feat.is-rev .feat__ghost {
  right: auto;
  left: -0.04em;
}

/* ---------- screen ---------- */

.feat__media {
  perspective: 1400px;
  min-width: 0;
}

.feat__screen {
  --cut: 20px;
  position: relative;
  display: block;
  padding: 1px;
  /* The link's own background is the border: a line colour, with a light that
     runs round it while hot. */
  background:
    conic-gradient(from var(--angle), transparent 0deg 250deg, rgba(240, 236, 216, 1) 320deg, transparent 360deg),
    linear-gradient(var(--line-strong), var(--line-strong));
  clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 450ms var(--ease);
  animation: trace 2.8s linear infinite paused;
}

.feat.is-hot .feat__screen {
  animation-play-state: running;
  transition-duration: 120ms;
}

.feat__glass {
  --cut-in: calc(var(--cut) - 0.5px);
  position: relative;
  display: block;
  height: clamp(280px, 34vw, 460px);
  background:
    linear-gradient(rgba(220, 216, 192, 0.05) 1px, transparent 1px) 0 0 / 100% 18px,
    linear-gradient(90deg, rgba(220, 216, 192, 0.05) 1px, transparent 1px) 0 0 / 18px 100%,
    radial-gradient(ellipse 80% 75% at 50% 70%, #1d1c16, #0a0908 80%);
  clip-path: polygon(var(--cut-in) 0, 100% 0, 100% calc(100% - var(--cut-in)), calc(100% - var(--cut-in)) 100%, 0 100%, 0 var(--cut-in));
  overflow: hidden;
}

.feat__fallback {
  width: 64px;
  height: 64px;
  color: var(--bone-dim);
}

.feat__hud {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bone-dim);
  pointer-events: none;
}
.feat__hud--tl {
  top: 12px;
  left: 24px;
  color: var(--bone);
}
.feat__hud--tr {
  top: 12px;
  right: 14px;
  padding: 3px 8px;
  border: 1px solid var(--line-strong);
  background: rgba(11, 10, 8, 0.6);
}
.feat__hud--bl {
  bottom: 12px;
  left: 14px;
}
.feat__hud--br {
  bottom: 12px;
  right: 24px;
  font-variant-numeric: tabular-nums;
}

.feat__hud-icon {
  width: 12px;
  height: 12px;
}

.feat__sweep {
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

.feat.is-hot .feat__sweep {
  animation: sweepDown 1.2s var(--ease) both;
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

.feat__glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgba(255, 250, 232, 0.12), transparent 42%);
  mix-blend-mode: screen;
  opacity: 0;
  transition: opacity var(--base) var(--ease);
}

.feat.is-hot .feat__glare {
  opacity: 1;
}

/* ---------- story ---------- */

.feat__body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  min-width: 0;
}

.feat__kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  color: var(--bone-mute);
}

.feat__kicker-num {
  color: var(--sig-text);
}

.feat__kicker-rule {
  width: 48px;
  height: 1px;
  background: var(--line-strong);
}

.feat__title {
  font-size: clamp(2.5rem, 5vw, 4.25rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.feat__blurb {
  max-width: 46ch;
  margin: 0;
  font-size: clamp(1rem, 1.25vw, 1.125rem);
  line-height: 1.65;
  color: var(--bone-dim);
}

.feat__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  width: 100%;
  max-width: 460px;
  margin: 4px 0 0;
  background: var(--line);
  border: 1px solid var(--line);
}

.feat__fact {
  display: flex;
  flex-direction: column-reverse;
  gap: 4px;
  padding: 12px 14px;
  background: #131210;
}

.feat__fact dt {
  color: var(--bone-mute);
  letter-spacing: 0.16em;
}

.feat__fact dd {
  margin: 0;
  font-family: var(--display);
  font-size: 1.75rem;
  line-height: 1;
  color: var(--bone);
}

.feat__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feat__stack li {
  padding: 5px 10px;
  font-family: var(--mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  color: var(--bone-dim);
  border: 1px solid var(--line);
  background: rgba(16, 15, 13, 0.6);
}

.feat__uplink {
  display: grid;
  grid-template-columns: 5.5em minmax(0, 1fr) 3.2em;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 460px;
  font-family: var(--mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bone-mute);
}

.feat__uplink-bar {
  height: 3px;
  background: rgba(220, 216, 192, 0.14);
}

.feat__uplink-bar > span {
  display: block;
  height: 100%;
  width: calc(var(--pct) * 1%);
  background: var(--sig-fill);
}

.feat__uplink-pct {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.feat__uplink-pct::after {
  counter-reset: pct var(--pct);
  content: counter(pct) '%';
}

.feat__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.feat__host {
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--bone-mute);
}

@media (max-width: 860px) {
  .feat,
  .feat.is-rev {
    grid-template-columns: minmax(0, 1fr);
  }

  .feat.is-rev .feat__media {
    order: 0;
  }

  .feat__glass {
    height: clamp(240px, 62vw, 380px);
  }

  .feat__ghost {
    display: none;
  }
}
</style>
