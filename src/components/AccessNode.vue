<script setup>
import { ref, onBeforeUnmount } from 'vue'
import NodeIcon from './NodeIcon.vue'
import NodeVignette from './NodeVignette.vue'

const props = defineProps({
  node: { type: Object, required: true },
  index: { type: Number, required: true },
})

// Pointer and keyboard both report activity, so nothing is hover-locked.
const emit = defineEmits(['engage'])

// --- decrypt effect ---------------------------------------------------------
// The real label never changes, so the accessible name stays stable. The
// scrambled copy is an aria-hidden overlay laid over a transparent original,
// which also keeps the row from reflowing while the glyphs churn.

const GLYPHS = 'AEHIKMNRSTXZ/#'
const STEPS = 12
const STEP_MS = 32

const scramble = ref('')
let timer = 0

function decrypt() {
  if (props.node.effect !== 'decrypt') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const target = props.node.label.toUpperCase()
  let step = 0

  clearInterval(timer)
  timer = setInterval(() => {
    step += 1
    const settled = Math.floor((step / STEPS) * target.length)
    scramble.value = [...target]
      .map((ch, i) =>
        ch === ' ' || i < settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      )
      .join('')

    if (step >= STEPS) {
      clearInterval(timer)
      scramble.value = ''
    }
  }, STEP_MS)
}

function engage() {
  emit('engage', props.node.id)
  decrypt()
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <li class="node">
    <a
      class="node__link"
      :class="{ 'node__link--featured': node.vignette }"
      :href="node.url"
      :target="node.external ? '_blank' : null"
      :rel="node.external ? 'noopener noreferrer' : null"
      @mouseenter="engage"
      @focus="engage"
    >
      <span class="node__marker" aria-hidden="true"></span>

      <span class="node__index label" aria-hidden="true">
        {{ String(index + 1).padStart(2, '0') }}
      </span>

      <span class="node__icon">
        <NodeIcon :name="node.icon" />
      </span>

      <span class="node__text">
        <span class="node__label">
          <span :class="{ 'is-masked': scramble }">{{ node.label }}</span>
          <span v-if="scramble" class="node__scramble" aria-hidden="true">{{ scramble }}</span>
        </span>
        <span class="node__desc">{{ node.desc }}</span>
        <span class="node__host label">{{ node.host }}</span>
      </span>

      <span v-if="node.vignette" class="node__vignette">
        <NodeVignette :name="node.vignette" />
      </span>

      <span class="node__kind label" aria-hidden="true">{{ node.kind }}</span>

      <svg
        class="node__arrow"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </svg>

      <span v-if="node.external" class="sr-only">(opens in a new tab)</span>
    </a>
  </li>
</template>

<style scoped>
/* The row lays itself out by its own width, not the viewport's: the list is
   narrow in the two-column desktop layout and wide on a tablet. */
.node {
  list-style: none;
  container: node / inline-size;
}

.node__link {
  position: relative;
  display: grid;
  /* kind gets a fixed track so both featured rows line their vignettes up */
  grid-template-columns: 14px auto 22px minmax(0, 1fr) auto 4.25rem 20px;
  grid-template-areas: 'marker index icon text vignette kind arrow';
  align-items: center;
  column-gap: var(--s-3);
  row-gap: var(--s-2);
  min-height: 76px; /* well past the 44px touch minimum */
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(220, 216, 192, 0.03), rgba(220, 216, 192, 0));
  color: var(--bone);
  cursor: pointer;
  overflow: hidden;
  transition:
    background-color var(--fast) var(--ease),
    border-color var(--fast) var(--ease),
    color var(--fast) var(--ease),
    transform var(--base) var(--ease);
}

/* Featured rows carry a little more weight at rest. */
.node__link--featured {
  border-color: var(--line-strong);
  background: linear-gradient(180deg, rgba(220, 216, 192, 0.06), rgba(220, 216, 192, 0.01));
}

/* The NieR selection: the row fills with bone and the text inverts. */
.node__link:hover,
.node__link:focus-visible {
  background: var(--bone);
  border-color: var(--bone);
  color: var(--void);
  transform: translateX(6px);
}

.node__marker {
  grid-area: marker;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid var(--sig-fill);
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity var(--fast) var(--ease),
    transform var(--fast) var(--ease);
}

.node__link:hover .node__marker,
.node__link:focus-visible .node__marker {
  opacity: 1;
  transform: none;
  border-left-color: var(--void);
}

.node__index {
  grid-area: index;
  color: var(--bone-mute);
  transition: color var(--fast) var(--ease);
}

.node__icon {
  grid-area: icon;
  width: 22px;
  height: 22px;
  color: var(--bone-dim);
  transition: color var(--fast) var(--ease);
}

.node__text {
  grid-area: text;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.node__label {
  position: relative;
  font-family: var(--display);
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* transparent, not visibility:hidden — hidden text drops out of the accessibility tree */
.is-masked {
  color: transparent;
}

.node__scramble {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.node__desc {
  font-size: 0.875rem;
  color: var(--bone-dim);
  transition: color var(--fast) var(--ease);
}

.node__host {
  color: var(--bone-mute);
  letter-spacing: 0.1em;
  text-transform: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--fast) var(--ease);
}

.node__vignette {
  grid-area: vignette;
  justify-self: start;
  width: 150px; /* the SVG's native 150x52 — no scaling blur on the thin strokes */
  height: 52px;
  color: var(--bone-dim);
  transition: color var(--fast) var(--ease);
}

.node__kind {
  grid-area: kind;
  justify-self: end;
  color: var(--bone-mute);
  white-space: nowrap;
  transition: color var(--fast) var(--ease);
}

.node__arrow {
  grid-area: arrow;
  width: 20px;
  height: 20px;
  color: var(--bone-mute);
  transition:
    color var(--fast) var(--ease),
    transform var(--base) var(--ease);
}

/* Every muted tone has to darken together, or the inverted row loses contrast. */
.node__link:hover .node__index,
.node__link:focus-visible .node__index,
.node__link:hover .node__kind,
.node__link:focus-visible .node__kind,
.node__link:hover .node__host,
.node__link:focus-visible .node__host {
  color: rgba(16, 15, 13, 0.62);
}

.node__link:hover .node__desc,
.node__link:focus-visible .node__desc,
.node__link:hover .node__icon,
.node__link:focus-visible .node__icon,
.node__link:hover .node__vignette,
.node__link:focus-visible .node__vignette,
.node__link:hover .node__arrow,
.node__link:focus-visible .node__arrow {
  color: rgba(16, 15, 13, 0.86);
}

.node__link:hover .node__arrow,
.node__link:focus-visible .node__arrow {
  transform: translate(3px, -3px);
}

.node__link:focus-visible {
  outline: 2px solid var(--sig-text);
  outline-offset: 3px;
}

/* Medium rows: the vignette drops under the text instead of squeezing it. */
@container node (max-width: 620px) {
  .node__link {
    grid-template-columns: 14px auto 22px minmax(0, 1fr) 4.25rem 20px;
    grid-template-areas: 'marker index icon text kind arrow';
  }

  .node__link--featured {
    grid-template-areas:
      'marker index icon text kind arrow'
      '. . . vignette vignette vignette';
  }

  /* Stacked, the scene has the whole text width to itself — use more of it. */
  .node__vignette {
    width: 168px;
    height: 58px;
  }
}

/* Narrow rows: drop kind and arrow, the row itself is the affordance. */
@container node (max-width: 460px) {
  .node__link {
    grid-template-columns: 10px auto 20px minmax(0, 1fr);
    grid-template-areas: 'marker index icon text';
    padding: var(--s-3);
  }

  .node__link--featured {
    grid-template-areas:
      'marker index icon text'
      '. . . vignette';
  }

  .node__kind,
  .node__arrow {
    display: none;
  }

  .node__label {
    font-size: 1.25rem;
  }

  /* Sliding rows would push the layout past the viewport on narrow screens. */
  .node__link:hover,
  .node__link:focus-visible {
    transform: none;
  }
}
</style>
