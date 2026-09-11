<script setup>
import SectionHead from './SectionHead.vue'
import ProjectFeature from './ProjectFeature.vue'

// Featured projects, one full-width block each, alternating sides.
const props = defineProps({
  nodes: { type: Array, required: true },
})
const emit = defineEmits(['engage'])
</script>

<template>
  <section id="projects" class="section" aria-labelledby="projects-title">
    <div class="wrap">
      <SectionHead id="projects-title" index="01" title="Projects" :meta="`${props.nodes.length} deployed · live`" />

      <div class="projects">
        <ProjectFeature
          v-for="(node, i) in nodes"
          :key="node.id"
          :node="node"
          :index="i"
          :reverse="i % 2 === 1"
          @engage="emit('engage', $event)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.projects {
  display: flex;
  flex-direction: column;
  gap: clamp(88px, 12vw, 160px);
}
</style>
