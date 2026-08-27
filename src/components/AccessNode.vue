<script setup>
import NodeIcon from './NodeIcon.vue'

defineProps({
  node: { type: Object, required: true },
  index: { type: Number, required: true },
})

// Pointer and keyboard both report activity, so nothing is hover-locked.
const emit = defineEmits(['engage'])
</script>

<template>
  <li class="node">
    <a
      class="node__link"
      :href="node.url"
      :target="node.external ? '_blank' : null"
      :rel="node.external ? 'noopener noreferrer' : null"
      @mouseenter="emit('engage', node.id)"
      @focus="emit('engage', node.id)"
    >
      <span class="node__marker" aria-hidden="true"></span>

      <span class="node__index label" aria-hidden="true">
        {{ String(index + 1).padStart(2, '0') }}
      </span>

      <span class="node__icon">
        <NodeIcon :name="node.icon" />
      </span>

      <span class="node__text">
        <span class="node__label">{{ node.label }}</span>
        <span class="node__desc">{{ node.desc }}</span>
        <span class="node__host label">{{ node.host }}</span>
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
.node {
  list-style: none;
}

.node__link {
  position: relative;
  display: grid;
  grid-template-columns: 14px auto 22px 1fr auto 20px;
  align-items: center;
  gap: var(--s-3);
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

/* The NieR selection: the row fills with bone and the text inverts. */
.node__link:hover,
.node__link:focus-visible {
  background: var(--bone);
  border-color: var(--bone);
  color: var(--void);
  transform: translateX(6px);
}

.node__marker {
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
  color: var(--bone-mute);
  transition: color var(--fast) var(--ease);
}

.node__icon {
  width: 22px;
  height: 22px;
  color: var(--bone-dim);
  transition: color var(--fast) var(--ease);
}

.node__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.node__label {
  font-family: var(--display);
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.node__kind {
  color: var(--bone-mute);
  white-space: nowrap;
  transition: color var(--fast) var(--ease);
}

.node__arrow {
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

@media (max-width: 640px) {
  .node__link {
    grid-template-columns: 10px auto 20px 1fr;
    gap: var(--s-2) var(--s-3);
    padding: var(--s-3);
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
