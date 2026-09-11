<script setup>
import SectionHead from './SectionHead.vue'
import AccessTerminal from './AccessTerminal.vue'

// The channels: every access point that isn't a featured project.
const props = defineProps({
  nodes: { type: Array, required: true },
})
const emit = defineEmits(['engage'])
</script>

<template>
  <section id="contact" class="section" aria-labelledby="contact-title">
    <div class="wrap">
      <SectionHead id="contact-title" index="03" title="Contact" :meta="`${props.nodes.length} channels open`" />

      <div class="contact">
        <div v-reveal class="contact__intro">
          <p class="contact__lede">Open a<br /><em>channel.</em></p>
          <p class="contact__text">
            Instagram for everything unfiltered. Email for anything serious — that one gets read
            first.
          </p>
        </div>

        <ul class="contact__grid">
          <AccessTerminal
            v-for="(node, i) in nodes"
            :key="node.id"
            v-reveal="i * 120"
            :node="node"
            :index="i + 2"
            @engage="emit('engage', $event)"
          />
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: center;
}

.contact__lede {
  margin: 0 0 18px;
  font-family: var(--display);
  font-size: clamp(2.75rem, 6vw, 5.5rem);
  font-weight: 300;
  line-height: 0.98;
  letter-spacing: 0.02em;
  color: var(--bone);
}

.contact__lede em {
  font-style: italic;
  color: var(--bone-dim);
}

.contact__text {
  max-width: 36ch;
  margin: 0;
  line-height: 1.7;
}

/* AccessTerminal sizes itself with @container matrix. */
.contact__grid {
  container: matrix / inline-size;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
}

@media (max-width: 960px) {
  .contact {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .contact__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
