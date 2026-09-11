<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import DecryptText from './DecryptText.vue'

// The HUD over the boot sequence. The 3D part runs in the backdrop
// (three/intro.js); this layer is the terminal chatter around it.
//
//   preload   three.js is still on its way: a plain terminal on black
//   intro     the 3D sequence is playing: full HUD, transparent background
//   fallback  no 3D (WebGL missing, too slow, reduced motion): four lines, done
const props = defineProps({
  mode: { type: String, default: 'preload' },
  phase: { type: String, default: null },
  progress: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
})
const emit = defineEmits(['done', 'skip'])

const PHASES = [
  { id: 'uplink', label: 'Uplink' },
  { id: 'assemble', label: 'Assemble core' },
  { id: 'breach', label: 'Breach' },
  { id: 'warp', label: 'Enter orbit' },
]

const FALLBACK = [
  'INITIALIZING SYSTEM',
  'MOUNTING HOLOGRAPHIC LAYER ... OK',
  'LOADING OPERATOR DOSSIER ..... OK',
  'CONNECTION ESTABLISHED',
]

const PRELOAD = ['ESTABLISHING UPLINK', 'FETCHING HOLOGRAPHIC LAYER', 'AWAITING GPU HANDSHAKE']

// [text, tone] — tone colours the line: ok, warn, err, or plain.
const LOG = [
  ['mount /dev/holo0 /mnt/orbit', 'ok'],
  ['handshake 0-H :: latency 12ms', ''],
  ['decrypt block 0x3F00..0x3FFF', ''],
  ['inject payload --sector 07', ''],
  ['firewall.service: integrity 100%', 'warn'],
  ['spawn shield[4] :: cores armed', ''],
  ['route 10.0.7.1 -> core.sys', ''],
  ['checksum 9F3A E1C0 77B2 0D4E', 'ok'],
  ['allocate 4096 fragments', ''],
  ['render(scene, camera) @ 60fps', ''],
  ['operator key accepted', 'ok'],
  ['WARN: trace detected, rerouting', 'warn'],
  ['bypass auth layer 2/3', ''],
  ['xor ecx, ecx ; jmp 0x7C00', ''],
  ['uplink stable :: 1.2 Gb/s', 'ok'],
  ['ERR: node 04 refused, retry', 'err'],
  ['node 04 breached', 'ok'],
  ['compile shaders [tunnel, core, warp]', ''],
  ['sync holographic layer', ''],
  ['core.sys :: pressure rising', 'warn'],
]

const PHASE_LINES = {
  uplink: ['>> PHASE 01 // UPLINK', 'warn'],
  assemble: ['>> PHASE 02 // ASSEMBLE CORE', 'warn'],
  breach: ['>> PHASE 03 // BREACH — FIREWALL DOWN', 'err'],
  warp: ['>> PHASE 04 // ENTER ORBIT', 'ok'],
}

const lines = ref([])
const log = ref([])
const hex = ref([])
const meters = ref([
  { id: 'CPU', v: 0.4 },
  { id: 'MEM', v: 0.6 },
  { id: 'NET', v: 0.3 },
])
const grantRun = ref(0)
let timers = []
let logTimer = 0
let hexTimer = 0
let logIndex = 0
let logId = 0

const pct = computed(() => String(Math.round(props.progress * 100)).padStart(3, '0'))
const clock = computed(() => props.seconds.toFixed(3).padStart(6, '0'))
const phaseIndex = computed(() => PHASES.findIndex((p) => p.id === props.phase))
const granted = computed(() => props.phase === 'breach' || props.phase === 'warp')

function pushLog(text, tone = '') {
  log.value.push({ id: logId++, ts: props.seconds.toFixed(2).padStart(5, '0'), text, tone })
  if (log.value.length > 17) log.value.shift()
}

function randomHex() {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()),
  )
}

function tickHex() {
  hex.value = [randomHex(), randomHex()]
  for (const m of meters.value) m.v = Math.min(1, Math.max(0.08, m.v + (Math.random() - 0.5) * 0.3))
}

function startIntroChatter() {
  clearInterval(logTimer)
  clearInterval(hexTimer)
  logTimer = setInterval(() => {
    if (props.phase === 'warp') return
    const [text, tone] = LOG[logIndex++ % LOG.length]
    pushLog(text, tone)
  }, 85)
  hexTimer = setInterval(tickHex, 90)
  tickHex()
}

function runFallback() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('done')
    return
  }
  lines.value = []
  FALLBACK.forEach((line, i) => timers.push(setTimeout(() => lines.value.push(line), 160 + i * 260)))
  timers.push(setTimeout(() => emit('done'), 160 + FALLBACK.length * 260 + 700))
}

function runPreload() {
  lines.value = []
  PRELOAD.forEach((line, i) => timers.push(setTimeout(() => lines.value.push(line), 120 + i * 380)))
}

watch(
  () => props.mode,
  (mode) => {
    timers.forEach(clearTimeout)
    timers = []
    if (mode === 'intro') startIntroChatter()
    else if (mode === 'fallback') runFallback()
    else runPreload()
  },
  { immediate: true },
)

watch(
  () => props.phase,
  (phase) => {
    if (!phase) return
    const [text, tone] = PHASE_LINES[phase]
    pushLog(text, tone)
    if (phase === 'breach') grantRun.value += 1
  },
)

// Any key skips, except Tab — keyboard users need it to reach the button.
function onKey(e) {
  if (e.key === 'Tab' || e.key === 'Shift') return
  if (props.mode === 'fallback') emit('done')
  else emit('skip')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  clearInterval(logTimer)
  clearInterval(hexTimer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="boot" :class="[`is-${mode}`, { 'is-warp': phase === 'warp' }]">
    <p class="sr-only" role="status">Loading Halldor Personal</p>

    <!-- preload and fallback: a plain terminal -->
    <div v-if="mode !== 'intro'" class="term" aria-hidden="true">
      <p v-for="line in lines" :key="line" class="term__line label">{{ line }}</p>
      <div v-if="mode === 'preload'" class="term__wait"><span></span></div>
    </div>

    <!-- intro: the full HUD -->
    <div v-else class="hud" aria-hidden="true">
      <span class="hud__corner hud__corner--tl"></span>
      <span class="hud__corner hud__corner--tr"></span>
      <span class="hud__corner hud__corner--bl"></span>
      <span class="hud__corner hud__corner--br"></span>

      <header class="hud__top">
        <span class="hud__brand">
          <span class="hud__glyph"></span>
          <span class="label hud__name">Halldor <span class="hud__sep">//</span> Personal</span>
        </span>
        <span class="label hud__sub">Boot sequence &middot; v4.0</span>
        <span class="hud__rule"></span>
        <span class="label hud__clock">T+ {{ clock }}</span>
      </header>

      <div class="hud__log">
        <p v-for="l in log" :key="l.id" class="hud__logline" :class="l.tone && `is-${l.tone}`">
          <span class="hud__ts">[{{ l.ts }}]</span> {{ l.text }}
        </p>
      </div>

      <div class="hud__side">
        <div v-for="(block, b) in hex" :key="b" class="hud__hex">
          <span class="label hud__hex-head">MEM 0x{{ b ? '7C00' : '3F00' }}</span>
          <span v-for="(row, r) in block" :key="r" class="hud__hex-row">
            <i v-for="(byte, c) in row" :key="c" :class="{ 'is-hot': (r * 4 + c + b) % 7 === Math.floor(seconds * 10) % 7 }">{{ byte }}</i>
          </span>
        </div>
        <div class="hud__meters">
          <span v-for="m in meters" :key="m.id" class="hud__meter">
            <span class="label">{{ m.id }}</span>
            <span class="hud__meter-bar"><span :style="{ transform: `scaleX(${m.v})` }"></span></span>
          </span>
          <span class="hud__meter">
            <span class="label">CORE</span>
            <span class="hud__meter-bar is-red"><span :style="{ transform: `scaleX(${progress})` }"></span></span>
          </span>
        </div>
      </div>

      <div v-if="granted" class="hud__grant">
        <p class="hud__granted" data-text="Access granted">
          <DecryptText text="Access granted" :trigger="grantRun" :steps="16" :step-ms="28" />
        </p>
        <p class="label hud__welcome">Welcome, operator</p>
      </div>

      <footer class="hud__bottom">
        <ol class="hud__phases">
          <li
            v-for="(p, i) in PHASES"
            :key="p.id"
            :class="{ 'is-done': i < phaseIndex, 'is-current': i === phaseIndex }"
          >
            <span class="hud__phase-num">0{{ i + 1 }}</span>{{ p.label }}
          </li>
        </ol>
        <div class="hud__progress">
          <span class="hud__pct">{{ pct }}<small>%</small></span>
          <span class="hud__bar"><span :style="{ transform: `scaleX(${progress})` }"></span></span>
        </div>
      </footer>
    </div>

    <button v-if="mode !== 'fallback'" type="button" class="cmd boot__skip" @click="emit('skip')">
      <span class="cmd__fill" aria-hidden="true"></span>
      <span>Skip intro</span>
      <kbd aria-hidden="true">Esc</kbd>
    </button>
  </div>
</template>

<style scoped>
.boot {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--void);
  transition: background-color 700ms var(--ease);
}

/* The 3D sequence shows through. */
.boot.is-intro {
  background: transparent;
}

/* ---------- preload / fallback terminal ---------- */

.term {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(420px, 82vw);
  transform: translate(-50%, -50%);
}

.term__line {
  margin: 0 0 var(--s-2);
  color: var(--bone);
  animation: lineIn 220ms var(--ease) both;
}

.term__line::before {
  content: '> ';
  color: var(--sig-text);
}

.term__wait {
  position: relative;
  height: 2px;
  margin-top: var(--s-4);
  background: var(--line);
  overflow: hidden;
}

.term__wait > span {
  position: absolute;
  top: 0;
  left: -30%;
  width: 30%;
  height: 100%;
  background: var(--sig-fill);
  animation: wait 1.1s var(--ease) infinite;
}

@keyframes wait {
  to {
    left: 100%;
  }
}

@keyframes lineIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- intro HUD ---------- */

.hud {
  position: absolute;
  inset: 0;
  padding: clamp(16px, 3vw, 36px);
  font-family: var(--mono);
  color: var(--bone-dim);
  animation: hudIn 500ms var(--ease) both;
  transition: opacity 700ms var(--ease);
}

.is-warp .hud {
  opacity: 0;
}

@keyframes hudIn {
  from {
    opacity: 0;
  }
}

.hud__corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border: 0 solid var(--bone);
}
.hud__corner--tl {
  top: 12px;
  left: 12px;
  border-top-width: 2px;
  border-left-width: 2px;
}
.hud__corner--tr {
  top: 12px;
  right: 12px;
  border-top-width: 2px;
  border-right-width: 2px;
}
.hud__corner--bl {
  bottom: 12px;
  left: 12px;
  border-bottom-width: 2px;
  border-left-width: 2px;
}
.hud__corner--br {
  bottom: 12px;
  right: 12px;
  border-bottom-width: 2px;
  border-right-width: 2px;
}

.hud__top {
  display: flex;
  align-items: center;
  gap: 18px;
}

.hud__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.hud__glyph {
  width: 12px;
  height: 12px;
  background: var(--sig-fill);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 60% 100%, 0 100%);
  box-shadow: 0 0 12px var(--sig-fill);
}

.hud__name {
  color: var(--bone);
}

.hud__sep {
  color: var(--sig-text);
}

.hud__sub {
  color: var(--bone-mute);
}

.hud__rule {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-strong) 0 4px, transparent 4px 8px);
}

.hud__clock {
  color: var(--bone);
  font-variant-numeric: tabular-nums;
}

/* ---------- log, left ---------- */

.hud__log {
  position: absolute;
  left: clamp(16px, 3vw, 36px);
  top: 18%;
  width: min(380px, 42vw);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 52%;
  overflow: hidden;
  mask-image: linear-gradient(180deg, transparent, #000 35%);
}

.hud__logline {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.75;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: typeIn 260ms steps(18, end) both;
}

.hud__ts {
  color: var(--bone-mute);
}

.hud__logline.is-ok {
  color: var(--bone);
}

.hud__logline.is-warn {
  color: var(--bone);
  text-shadow: 0 0 10px rgba(220, 216, 192, 0.5);
}

.hud__logline.is-err {
  color: var(--sig-text);
  text-shadow: 0 0 10px rgba(224, 87, 79, 0.6);
}

@keyframes typeIn {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

/* ---------- hex and meters, right ---------- */

.hud__side {
  position: absolute;
  right: clamp(16px, 3vw, 36px);
  top: 18%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 190px;
}

.hud__hex {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hud__hex-head {
  margin-bottom: 4px;
  color: var(--bone-mute);
}

.hud__hex-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
}

.hud__hex-row i {
  font-style: normal;
}

.hud__hex-row i.is-hot {
  color: var(--sig-text);
}

.hud__meters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hud__meter {
  display: grid;
  grid-template-columns: 3.4em 1fr;
  align-items: center;
  gap: 10px;
}

.hud__meter-bar {
  height: 3px;
  background: rgba(220, 216, 192, 0.14);
}

.hud__meter-bar > span {
  display: block;
  height: 100%;
  background: var(--bone);
  transform-origin: left;
  transition: transform 90ms linear;
}

.hud__meter-bar.is-red > span {
  background: var(--sig-fill);
  box-shadow: 0 0 8px var(--sig-fill);
}

/* ---------- ACCESS GRANTED ---------- */

.hud__grant {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  animation: grantIn 380ms var(--ease) both;
}

@keyframes grantIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.25);
    letter-spacing: 0.5em;
  }
}

.hud__granted {
  position: relative;
  margin: 0;
  font-family: var(--display);
  font-size: clamp(2.4rem, 7.5vw, 6.5rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #fffbe8;
  text-shadow:
    0 0 24px rgba(255, 251, 232, 0.55),
    0 0 60px rgba(220, 216, 192, 0.35);
}

.hud__granted::before,
.hud__granted::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hud__granted::before {
  color: var(--sig-text);
  animation: split 900ms steps(6, end) infinite;
}

.hud__granted::after {
  color: #9fe6ff;
  opacity: 0.35;
  animation: split 900ms steps(6, end) infinite reverse;
}

@keyframes split {
  0% {
    clip-path: inset(10% 0 70% 0);
    transform: translate(-6px, 0);
  }
  33% {
    clip-path: inset(55% 0 20% 0);
    transform: translate(5px, 0);
  }
  66% {
    clip-path: inset(80% 0 4% 0);
    transform: translate(-3px, 0);
  }
  100% {
    clip-path: inset(30% 0 50% 0);
    transform: translate(4px, 0);
  }
}

.hud__welcome {
  margin: 14px 0 0;
  color: var(--bone);
  letter-spacing: 0.4em;
}

/* ---------- bottom: phases and progress ---------- */

.hud__bottom {
  position: absolute;
  left: clamp(16px, 3vw, 36px);
  right: clamp(16px, 3vw, 36px);
  bottom: clamp(16px, 3vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* room for the skip button on the right */
  padding-right: 200px;
}

.hud__phases {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hud__phases li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bone-mute);
  border: 1px solid var(--line);
  transition:
    background-color var(--fast) var(--ease),
    color var(--fast) var(--ease);
}

.hud__phase-num {
  color: var(--bone-mute);
}

.hud__phases li.is-done {
  color: var(--bone-dim);
}

/* The current phase inverts to bone, like a NieR menu selection. */
.hud__phases li.is-current {
  color: var(--void);
  background: var(--bone);
  border-color: var(--bone);
}

.hud__phases li.is-current .hud__phase-num {
  color: var(--sig-fill);
}

.hud__progress {
  display: flex;
  align-items: flex-end;
  gap: 18px;
}

.hud__pct {
  font-family: var(--display);
  font-size: clamp(3rem, 7vw, 5.5rem);
  font-weight: 300;
  line-height: 0.8;
  color: var(--bone);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 22px rgba(220, 216, 192, 0.35);
}

.hud__pct small {
  font-size: 0.4em;
  color: var(--bone-mute);
}

.hud__bar {
  position: relative;
  flex: 1;
  height: 4px;
  margin-bottom: 6px;
  background: repeating-linear-gradient(90deg, rgba(220, 216, 192, 0.2) 0 2px, transparent 2px 10px);
}

.hud__bar > span {
  position: absolute;
  inset: 0;
  background: var(--sig-fill);
  box-shadow: 0 0 12px var(--sig-fill);
  transform-origin: left;
}

/* ---------- skip ---------- */

.boot__skip {
  position: absolute;
  right: clamp(16px, 3vw, 36px);
  bottom: clamp(16px, 3vw, 36px);
  z-index: 1;
}

.boot__skip kbd {
  color: inherit;
  border-color: currentColor;
}

@media (max-width: 760px) {
  .hud__side,
  .hud__sub {
    display: none;
  }

  .hud__log {
    width: calc(100% - 32px);
    height: 36%;
    top: 12%;
  }

  .hud__bottom {
    padding-right: 0;
    bottom: 84px;
  }

  .hud__phases li:not(.is-current) {
    display: none;
  }

  /* Two lines on a phone instead of running off both edges. */
  .hud__grant {
    width: 92vw;
  }

  .hud__granted {
    font-size: 3.25rem;
    letter-spacing: 0.1em;
    white-space: normal;
    line-height: 0.95;
  }
}
</style>
