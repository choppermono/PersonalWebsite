<script setup>
// Small animated scenes for featured rows. Pure decoration: aria-hidden, and
// every element draws in currentColor so the row's hover inversion carries over.
defineProps({
  name: { type: String, required: true },
})

// One heartbeat drawn twice: flat, P wave, QRS spike, T wave.
const ECG =
  'M26 30H44l3-4 3 4h6l3 7 5-27 5 31 3-11h8q5-7 10 0h8l3-4 3 4h6l3 7 5-27 5 31 3-11h8q5-7 10 0h4'
</script>

<template>
  <svg
    class="vignette"
    viewBox="0 0 150 52"
    fill="none"
    stroke="currentColor"
    stroke-width="1"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path class="v-grid" d="M0 13h150M0 26h150M0 39h150M25 0v52M50 0v52M75 0v52M100 0v52M125 0v52" />
    <path class="v-frame" d="M1 8V1h7M142 1h7v7M149 44v7h-7M8 51H1v-7" />

    <!-- NieR hacking: the ship fires at a core, the core fires back -->
    <template v-if="name === 'hack'">
      <path class="v-ship" d="M10 18 28 26 10 34 14 26Z" fill="currentColor" stroke="none" />

      <g fill="currentColor" stroke="none">
        <rect class="v-shot" x="30" y="25.25" width="7" height="1.5" />
        <rect class="v-shot" x="30" y="25.25" width="7" height="1.5" />
        <rect class="v-shot" x="30" y="25.25" width="7" height="1.5" />
      </g>

      <g class="v-fire" stroke="none">
        <circle class="v-bullet v-bullet--a" cx="124" cy="26" r="2.1" />
        <circle class="v-bullet v-bullet--b" cx="124" cy="26" r="2.1" />
        <circle class="v-bullet v-bullet--c" cx="124" cy="26" r="2.1" />
      </g>

      <circle class="v-ring" cx="124" cy="26" r="16" stroke-dasharray="2.5 4" />
      <path class="v-shell" d="M124 14 136 26 124 38 112 26Z" stroke-width="1.2" />
      <circle class="v-core" cx="124" cy="26" r="4.5" fill="currentColor" stroke="none" />
    </template>

    <!-- Trackify: a heart monitor. Faint trace, a bright sweep running along it -->
    <template v-else-if="name === 'pulse'">
      <path
        class="v-heart"
        d="M13 21.2c-1.5-2.6-5.6-2-5.6 1.2 0 2.8 3.3 4.8 5.6 6.7 2.3-1.9 5.6-3.9 5.6-6.7 0-3.2-4.1-3.8-5.6-1.2Z"
        stroke="none"
      />
      <path class="v-trace" :d="ECG" pathLength="100" />
      <path class="v-sweep" :d="ECG" pathLength="100" />
    </template>
  </svg>
</template>

<style scoped>
.vignette {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.v-grid {
  opacity: 0.14;
}

.v-frame {
  opacity: 0.45;
}

/* Anything that rotates or scales has to do it around its own centre. */
.v-ship,
.v-ring,
.v-shell,
.v-core,
.v-heart {
  transform-box: fill-box;
  transform-origin: center;
}

/* ---------- hack ---------- */

.v-ship {
  animation: bob 2.4s ease-in-out infinite;
}

.v-shot {
  animation: shot 1.2s linear infinite;
}
.v-shot:nth-child(2) {
  animation-delay: -0.4s;
}
.v-shot:nth-child(3) {
  animation-delay: -0.8s;
}

.v-fire {
  fill: var(--sig-fill);
}

.v-bullet {
  animation: fire 1.8s linear infinite;
}
.v-bullet--a {
  --dx: -58px;
  --dy: -15px;
}
.v-bullet--b {
  --dx: -66px;
  --dy: 0px;
  animation-delay: -0.6s;
}
.v-bullet--c {
  --dx: -58px;
  --dy: 15px;
  animation-delay: -1.2s;
}

.v-ring {
  opacity: 0.55;
  animation: spin 9s linear infinite reverse;
}

.v-shell {
  animation: spin 5s linear infinite;
}

.v-core {
  animation: throb 1.2s ease-in-out infinite alternate;
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(-1.5px);
  }
  50% {
    transform: translateY(1.5px);
  }
}

@keyframes shot {
  0% {
    transform: translateX(0);
    opacity: 0;
  }
  10%,
  80% {
    opacity: 1;
  }
  100% {
    transform: translateX(70px);
    opacity: 0;
  }
}

@keyframes fire {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }
  15%,
  85% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy));
    opacity: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes throb {
  from {
    transform: scale(0.85);
  }
  to {
    transform: scale(1.15);
  }
}

/* ---------- pulse ---------- */

.v-heart {
  fill: var(--sig-fill);
  animation: beat 1.1s ease-out infinite;
}

.v-trace {
  opacity: 0.3;
  stroke-width: 1.2;
}

.v-sweep {
  stroke-width: 1.8;
  stroke-dasharray: 20 80;
  animation: sweep 2.2s linear infinite;
}

/* lub-dub: two contractions, then rest */
@keyframes beat {
  0%,
  52%,
  100% {
    transform: scale(1);
  }
  12% {
    transform: scale(1.22);
  }
  24% {
    transform: scale(0.96);
  }
  36% {
    transform: scale(1.1);
  }
}

@keyframes sweep {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Without motion each scene freezes into a composed still, not a pile-up at the origin. */
@media (prefers-reduced-motion: reduce) {
  .v-ship,
  .v-shot,
  .v-bullet,
  .v-ring,
  .v-shell,
  .v-core,
  .v-heart,
  .v-sweep {
    animation: none;
  }

  .v-shot:nth-child(1) {
    transform: translateX(4px);
  }
  .v-shot:nth-child(2) {
    transform: translateX(24px);
  }
  .v-shot:nth-child(3) {
    transform: translateX(44px);
  }

  .v-bullet--a {
    transform: translate(-24px, -6px);
  }
  .v-bullet--b {
    transform: translate(-30px, 0);
  }
  .v-bullet--c {
    transform: translate(-24px, 6px);
  }

  .v-trace {
    opacity: 0.85;
  }
  .v-sweep {
    display: none;
  }
}
</style>
