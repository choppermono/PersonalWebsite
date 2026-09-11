<script setup>
import { ref } from 'vue'

// "Initiate hack". Appears once the 3D layer is loaded; until then, or if WebGL
// is missing, a status line stands in its place. Used large in the hero and
// compact in the nav.
defineProps({
  armed: { type: Boolean, default: false },
  offline: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['hack'])

const button = ref(null)
defineExpose({ focus: () => button.value?.focus({ preventScroll: true }) })
</script>

<template>
  <button
    v-if="armed"
    ref="button"
    type="button"
    class="cmd hackbtn"
    :class="{ 'is-compact': compact }"
    @click="emit('hack')"
  >
    <span class="cmd__fill" aria-hidden="true"></span>
    <span class="cmd__mark" aria-hidden="true"></span>
    <span>{{ compact ? 'Hack' : 'Initiate hack' }}</span>
    <span v-if="!compact" class="cmd__meta" aria-hidden="true">4 cores</span>
  </button>
  <span v-else-if="!compact" class="label hackbtn__status">
    Hack module &middot; {{ offline ? 'offline' : 'loading' }}
  </span>
</template>

<style scoped>
.hackbtn {
  width: min(100%, 320px);
}

.hackbtn.is-compact {
  --c: 7px;
  width: auto;
  min-height: 36px;
  padding: 0 14px;
  font-size: 0.6875rem;
  gap: 10px;
}

.hackbtn__status {
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  color: var(--bone-mute);
}
</style>
