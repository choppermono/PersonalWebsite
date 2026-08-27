<script setup>
// Stroke icons drawn on a 24x24 grid, Feather-style. No emoji as icons.
defineProps({
  name: { type: String, required: true },
})
</script>

<template>
  <svg
    class="node-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'globe'">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </template>

    <template v-else-if="name === 'instagram'">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'mail'">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </template>

    <!-- Fallback keeps the layout stable if a data entry has a typo -->
    <template v-else>
      <circle cx="12" cy="12" r="9" />
    </template>
  </svg>
</template>

<style scoped>
.node-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
