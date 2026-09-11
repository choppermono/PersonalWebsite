<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { sections } from '../data/profile.js'
import HackButton from './HackButton.vue'

// The bar across the top. Transparent over the hero, solid once the page moves.
// Marks the section in view and draws scroll progress along its bottom edge.
defineProps({
  armed: { type: Boolean, default: false },
  offline: { type: Boolean, default: false },
})
const emit = defineEmits(['hack'])

const root = ref(null)
const hackBtn = ref(null)
const solid = ref(false)
const current = ref(null)
let io = null
let frame = 0

// Progress goes straight to a CSS variable: no re-render on every scroll event.
function onScroll() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
    root.value?.style.setProperty('--progress', p.toFixed(4))
    solid.value = window.scrollY > 24
  })
}

onMounted(() => {
  // A section counts as current while it crosses the middle band of the screen.
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) current.value = e.target.id
        else if (current.value === e.target.id) current.value = null
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )
  for (const s of sections) {
    const el = document.getElementById(s.id)
    if (el) io.observe(el)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  onScroll()
})

onBeforeUnmount(() => {
  io?.disconnect()
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})

defineExpose({ focusTrigger: () => hackBtn.value?.focus() })
</script>

<template>
  <header ref="root" class="nav" :class="{ 'is-solid': solid }">
    <div class="nav__in">
      <a href="#top" class="nav__brand">
        <span class="nav__glyph" aria-hidden="true"></span>
        <span class="label nav__name">Halldor<span class="nav__tail"> <span class="nav__sep">//</span> Personal</span></span>
      </a>

      <nav class="nav__links" aria-label="Sections">
        <a
          v-for="s in sections"
          :key="s.id"
          :href="`#${s.id}`"
          class="nav__link"
          :class="{ 'is-current': current === s.id }"
          :aria-current="current === s.id ? 'true' : null"
        >
          <span class="nav__num" aria-hidden="true">{{ s.index }}</span>{{ s.label }}
        </a>
      </nav>

      <div class="nav__hack">
        <HackButton ref="hackBtn" compact :armed="armed" :offline="offline" @hack="emit('hack')" />
      </div>
    </div>
    <span class="nav__progress" aria-hidden="true"></span>
  </header>
</template>

<style scoped>
.nav {
  --progress: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: var(--nav-h);
  border-bottom: 1px solid transparent;
  transition:
    background-color var(--base) var(--ease),
    border-color var(--base) var(--ease),
    backdrop-filter var(--base) var(--ease);
}

.nav.is-solid {
  background: rgba(16, 15, 13, 0.78);
  border-bottom-color: var(--line);
  backdrop-filter: blur(10px);
}

.nav__in {
  display: flex;
  align-items: center;
  gap: clamp(12px, 3vw, 40px);
  height: 100%;
  padding-inline: var(--gutter);
}

.nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  white-space: nowrap;
}

.nav__glyph {
  width: 12px;
  height: 12px;
  background: var(--sig-fill);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 60% 100%, 0 100%);
  box-shadow: 0 0 10px var(--sig-fill);
}

.nav__name {
  color: var(--bone);
}

.nav__sep {
  color: var(--sig-text);
}

.nav__links {
  display: flex;
  align-items: center;
  gap: clamp(4px, 1.6vw, 28px);
  margin-left: auto;
}

.nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 6px;
  font-family: var(--mono);
  font-size: 0.6875rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bone-dim);
  transition: color var(--fast) var(--ease);
}

.nav__num {
  color: var(--bone-mute);
  transition: color var(--fast) var(--ease);
}

/* The underline grows from the left, like the selection bar in a NieR menu. */
.nav__link::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 8px;
  height: 1px;
  background: var(--bone);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--base) var(--ease);
}

.nav__link:hover,
.nav__link.is-current {
  color: var(--bone);
}

.nav__link.is-current .nav__num {
  color: var(--sig-text);
}

.nav__link:hover::after,
.nav__link.is-current::after {
  transform: scaleX(1);
}

.nav__hack {
  display: flex;
}

.nav__hack :deep(.hackbtn.is-compact) {
  min-height: 44px;
}

.nav__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: var(--sig-fill);
  transform: scaleX(var(--progress));
  transform-origin: left;
  box-shadow: 0 0 8px var(--sig-fill);
}

@media (max-width: 760px) {
  .nav__tail,
  .nav__hack {
    display: none;
  }
}

@media (max-width: 460px) {
  .nav__num {
    display: none;
  }

  .nav__link {
    letter-spacing: 0.14em;
    padding: 0 4px;
  }
}
</style>
