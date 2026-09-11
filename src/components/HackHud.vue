<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  status: { type: Object, required: true },
  banner: { type: Object, default: null },
  end: { type: Object, default: null },
  hitPulse: { type: Number, default: 0 },
})
const emit = defineEmits(['exit', 'retry'])

const region = ref(null)
const primary = ref(null)

const pad = (n) => String(n).padStart(2, '0')
const sectorNumber = computed(() => pad(props.status.index ?? 1))
const coreProgress = computed(() =>
  props.status.coresTotal ? (props.status.cores / props.status.coresTotal) * 100 : 0,
)
const segments = computed(() =>
  Array.from({ length: props.status.maxHp ?? 3 }, (_, i) => i < (props.status.hp ?? 0)),
)

function formatTime(s) {
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  return `${pad(m)}:${rest.toFixed(1).padStart(4, '0')}`
}

// What a screen reader hears. The arena itself is visual only.
const live = computed(() => {
  if (props.end) {
    return props.end.result === 'complete'
      ? `Hacking complete. Access granted in ${formatTime(props.end.time)}.`
      : `Hacking failed in sector ${props.end.sector}.`
  }
  if (props.banner) return `Sector ${pad(props.banner.index)}: ${props.banner.title}.`
  return ''
})

function onKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('exit')
  }
}

// Focus follows the context: into the HUD on entry, onto the first action at the end.
watch(
  () => props.end,
  async (value) => {
    if (!value) return
    await nextTick()
    primary.value?.focus()
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKey)
  region.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div ref="region" class="hud" role="region" aria-label="Hacking mode" tabindex="-1">
    <p class="sr-only" aria-live="polite">{{ live }}</p>

    <div :key="hitPulse" class="hud__damage" :class="{ 'is-hit': hitPulse > 0 }" aria-hidden="true"></div>

    <header class="hud__row hud__row--top">
      <div class="hud__block">
        <span class="label">Hacking</span>
        <span class="hud__sector">
          <span class="hud__num">{{ sectorNumber }}</span>
          <span class="hud__slash" aria-hidden="true">/</span>
          {{ status.sector }}
        </span>
      </div>

      <div class="hud__block hud__block--end">
        <span class="label">Cores breached</span>
        <span class="hud__count">{{ status.cores }} <span class="hud__of">/ {{ status.coresTotal }}</span></span>
        <span class="hud__bar" aria-hidden="true">
          <span class="hud__fill" :style="{ width: coreProgress + '%' }"></span>
        </span>
      </div>
    </header>

    <Transition name="banner">
      <div v-if="banner && !end" :key="banner.id" class="hud__banner" aria-hidden="true">
        <span class="label">Sector {{ pad(banner.index) }} of {{ status.sectors }}</span>
        <strong class="hud__banner-title">{{ banner.title }}</strong>
        <span class="hud__banner-rule"></span>
      </div>
    </Transition>

    <footer class="hud__row hud__row--bottom">
      <div class="hud__block">
        <span class="label">Integrity</span>
        <span class="hud__hp" :aria-label="`${status.hp} of ${status.maxHp}`" role="img">
          <span
            v-for="(alive, i) in segments"
            :key="i"
            class="hud__seg"
            :class="{ 'is-lost': !alive }"
          ></span>
        </span>
      </div>

      <p class="hud__hint label">
        <span>Move <kbd>WASD</kbd> <kbd>&larr;&uarr;&rarr;&darr;</kbd> or pointer</span>
        <span>Fire auto</span>
        <span>Red shots can be shot down</span>
      </p>

      <button type="button" class="hud__exit" @click="emit('exit')">
        Exit <kbd>Esc</kbd>
      </button>
    </footer>

    <Transition name="end">
      <div
        v-if="end"
        class="hud__end"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-end-title"
      >
        <span class="hud__corner hud__corner--tl" aria-hidden="true"></span>
        <span class="hud__corner hud__corner--tr" aria-hidden="true"></span>
        <span class="hud__corner hud__corner--bl" aria-hidden="true"></span>
        <span class="hud__corner hud__corner--br" aria-hidden="true"></span>

        <template v-if="end.result === 'complete'">
          <span class="label">Hacking complete</span>
          <h2 id="hud-end-title" class="hud__end-title">Access granted</h2>
          <dl class="hud__stats">
            <div><dt class="label">Time</dt><dd>{{ formatTime(end.time) }}</dd></div>
            <div><dt class="label">Integrity</dt><dd>{{ end.maxHp - end.damage }} / {{ end.maxHp }}</dd></div>
            <div><dt class="label">Cores</dt><dd>{{ status.coresTotal }} / {{ status.coresTotal }}</dd></div>
          </dl>
          <div class="hud__actions">
            <a
              ref="primary"
              class="hud__btn hud__btn--solid"
              href="https://nier.halldor.ch"
              target="_blank"
              rel="noopener noreferrer"
            >
              Play the full game <span aria-hidden="true">&#8599;</span>
              <span class="sr-only">(opens in a new tab)</span>
            </a>
            <button type="button" class="hud__btn" @click="emit('exit')">Return to orbit</button>
          </div>
        </template>

        <template v-else>
          <span class="label hud__label--red">Connection severed</span>
          <h2 id="hud-end-title" class="hud__end-title">Hacking failed</h2>
          <dl class="hud__stats">
            <div><dt class="label">Sector</dt><dd>{{ end.sector }}</dd></div>
            <div><dt class="label">Time</dt><dd>{{ formatTime(end.time) }}</dd></div>
            <div><dt class="label">Cores</dt><dd>{{ status.cores }} / {{ status.coresTotal }}</dd></div>
          </dl>
          <div class="hud__actions">
            <button ref="primary" type="button" class="hud__btn hud__btn--solid" @click="emit('retry')">Retry</button>
            <button type="button" class="hud__btn" @click="emit('exit')">Return to orbit</button>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hud {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(14px, 3vw, 32px);
  color: var(--bone);
  /* Waits out the dive, so the HUD lands with the arena, not before it. */
  animation: hudIn 500ms var(--ease) 1000ms both;
}

.hud:focus {
  outline: none;
}

@keyframes hudIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.hud__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-4);
}

.hud__row--top {
  align-items: flex-start;
}

.hud__block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.hud__block--end {
  align-items: flex-end;
  text-align: right;
}

.hud__sector {
  font-family: var(--display);
  font-size: clamp(1.25rem, 2.6vw, 1.75rem);
  font-weight: 400;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 0.4em;
}

.hud__num,
.hud__count {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}

.hud__num {
  font-size: 0.7em;
  color: var(--sig-text);
  letter-spacing: 0.08em;
}

.hud__slash {
  color: var(--bone-mute);
}

.hud__count {
  font-size: 1.125rem;
  line-height: 1;
}

.hud__of {
  color: var(--bone-dim);
}

.hud__bar {
  display: block;
  width: 140px;
  height: 3px;
  background: rgba(220, 216, 192, 0.16);
}

.hud__fill {
  display: block;
  height: 100%;
  background: var(--bone);
  transition: width var(--base) var(--ease);
}

.hud__hp {
  display: flex;
  gap: 5px;
}

.hud__seg {
  width: 34px;
  height: 10px;
  background: var(--bone);
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
  transition: background-color var(--base) var(--ease);
}

.hud__seg.is-lost {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--sig-fill);
  background: rgba(188, 63, 60, 0.28);
}

.hud__hint {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 18px;
  margin: 0;
  color: var(--bone-dim);
  letter-spacing: 0.16em;
  animation: hintOut 600ms var(--ease) 7s both;
}

@keyframes hintOut {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

kbd {
  font-family: var(--mono);
  font-size: 0.625rem;
  padding: 1px 5px;
  border: 1px solid var(--line-strong);
  color: var(--bone);
}

.hud__exit {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  font: 500 0.75rem/1 var(--mono);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bone);
  background: rgba(16, 15, 13, 0.7);
  border: 1px solid var(--line-strong);
  cursor: pointer;
  transition:
    background-color var(--fast) var(--ease),
    color var(--fast) var(--ease);
}

.hud__exit:hover,
.hud__exit:focus-visible {
  background: var(--bone);
  color: var(--void);
}

.hud__exit:hover kbd,
.hud__exit:focus-visible kbd {
  color: var(--void);
  border-color: rgba(16, 15, 13, 0.5);
}

/* ---------- sector banner ---------- */

.hud__banner {
  position: absolute;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  white-space: nowrap;
}

.hud__banner-title {
  font-family: var(--display);
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 300;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  line-height: 1;
  margin-right: -0.3em; /* the tracking after the last letter would push it off-centre */
}

.hud__banner-rule {
  display: block;
  width: 180px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--sig-text), transparent);
}

.banner-enter-active {
  animation: bannerIn 520ms var(--ease) both;
}
.banner-leave-active {
  animation: bannerIn 360ms var(--ease) reverse both;
}

@keyframes bannerIn {
  from {
    opacity: 0;
    letter-spacing: 0.6em;
    filter: blur(6px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

/* ---------- damage ---------- */

.hud__damage {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  box-shadow: inset 0 0 120px 20px rgba(188, 63, 60, 0.55);
}

.hud__damage.is-hit {
  animation: hit 520ms var(--ease) both;
}

@keyframes hit {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ---------- end screen ---------- */

.hud__end {
  pointer-events: auto;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 32px));
  padding: clamp(24px, 4vw, 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  text-align: center;
  background: rgba(16, 15, 13, 0.88);
  border: 1px solid var(--line-strong);
  backdrop-filter: blur(6px);
}

.hud__corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 0 solid var(--bone);
}
.hud__corner--tl {
  top: -1px;
  left: -1px;
  border-top-width: 2px;
  border-left-width: 2px;
}
.hud__corner--tr {
  top: -1px;
  right: -1px;
  border-top-width: 2px;
  border-right-width: 2px;
}
.hud__corner--bl {
  bottom: -1px;
  left: -1px;
  border-bottom-width: 2px;
  border-left-width: 2px;
}
.hud__corner--br {
  bottom: -1px;
  right: -1px;
  border-bottom-width: 2px;
  border-right-width: 2px;
}

.hud__label--red {
  color: var(--sig-text);
}

.hud__end-title {
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 300;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-wrap: balance;
  margin-right: -0.18em;
}

.hud__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-3);
  width: 100%;
  margin: var(--s-2) 0;
  padding: var(--s-3) 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.hud__stats div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hud__stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  color: var(--bone);
}

.hud__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-2);
  width: 100%;
}

.hud__btn {
  flex: 1 1 180px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  font: 500 0.75rem/1 var(--mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bone);
  background: transparent;
  border: 1px solid var(--line-strong);
  cursor: pointer;
  transition:
    background-color var(--fast) var(--ease),
    color var(--fast) var(--ease),
    border-color var(--fast) var(--ease);
}

.hud__btn--solid {
  background: var(--bone);
  color: var(--void);
  border-color: var(--bone);
}

.hud__btn:hover,
.hud__btn:focus-visible {
  background: var(--bone);
  color: var(--void);
  border-color: var(--bone);
}

.hud__btn--solid:hover,
.hud__btn--solid:focus-visible {
  background: transparent;
  color: var(--bone);
}

.end-enter-active {
  animation: endIn 460ms var(--ease) both;
}
.end-leave-active {
  animation: endIn 200ms var(--ease) reverse both;
}

@keyframes endIn {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 14px));
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

@media (max-width: 640px) {
  .hud__hint {
    display: none;
  }

  .hud__bar {
    width: 96px;
  }

  .hud__seg {
    width: 26px;
  }

  .hud__stats dd {
    font-size: 0.875rem;
  }
}
</style>
