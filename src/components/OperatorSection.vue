<script setup>
import { identity } from '../data/profile.js'
import SectionHead from './SectionHead.vue'
import ClockDial from './instruments/ClockDial.vue'
import StatusScope from './instruments/StatusScope.vue'
import UptimeReadout from './instruments/UptimeReadout.vue'
import HexDump from './instruments/HexDump.vue'
import DesignationCode from './instruments/DesignationCode.vue'
import FirewallBar from './instruments/FirewallBar.vue'
import UplinkStrip from './UplinkStrip.vue'

// The operator's telemetry, laid out as a wall of instruments. Clock, zone and
// uptime are real; the rest is decoration and says so in its own component.
defineProps({
  breached: { type: Boolean, default: false },
  node: { type: Object, required: true },
  pulse: { type: Number, default: 0 },
})

// Flavour only — regenerated on every load, means nothing.
const session = Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')
</script>

<template>
  <section id="operator" class="section" aria-labelledby="operator-title">
    <div class="wrap">
      <SectionHead id="operator-title" index="02" title="Operator" :meta="`File ${identity.designation.replace('UNIT ', '')}`" />

      <div class="op">
        <div v-reveal class="op__intro">
          <span class="label op__kicker">Status report</span>
          <p class="op__lede">
            System nominal.<br />
            <em>All channels open.</em>
          </p>
          <p class="op__text">
            Clock, time zone and uptime are measured live in your browser. Everything else is
            noise from the terminal. Win the hack and watch the firewall fall.
          </p>
          <dl class="op__meta">
            <div>
              <dt class="label">Operator</dt>
              <dd>{{ identity.operator }}</dd>
            </div>
            <div>
              <dt class="label">Unit</dt>
              <dd>{{ identity.designation }}</dd>
            </div>
            <div>
              <dt class="label">Build</dt>
              <dd>{{ identity.build }}</dd>
            </div>
          </dl>
        </div>

        <div class="op__wall">
          <div v-reveal="80" class="op__grid">
            <ClockDial class="is-wide" />
            <StatusScope :breached="breached" />
            <UptimeReadout />
            <HexDump :session="session" />
            <DesignationCode :value="identity.designation" />
            <FirewallBar class="is-full" :breached="breached" />
          </div>
          <div v-reveal="160">
            <UplinkStrip :node="node" :pulse="pulse" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.op {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: start;
}

.op__intro {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: calc(var(--nav-h) + 32px);
}

.op__kicker {
  color: var(--bone-mute);
}

.op__lede {
  margin: 0;
  font-family: var(--display);
  font-size: clamp(2rem, 3.6vw, 3.25rem);
  font-weight: 300;
  line-height: 1.08;
  color: var(--bone);
}

.op__lede em {
  font-style: italic;
  color: var(--bone-dim);
}

.op__text {
  max-width: 40ch;
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
}

.op__meta {
  display: flex;
  flex-direction: column;
  margin: 8px 0 0;
  border-top: 1px solid var(--line);
}

.op__meta > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.op__meta dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.8125rem;
  color: var(--bone);
  text-align: right;
}

.op__wall {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

/* Hairline-separated tiles: the gap shows the line colour behind them. */
.op__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}

.op__grid > .is-wide {
  grid-column: span 2;
}

.op__grid > .is-full {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .op {
    grid-template-columns: minmax(0, 1fr);
  }

  .op__intro {
    position: static;
  }
}

@media (max-width: 620px) {
  .op__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .op__grid > .is-wide {
    grid-column: 1 / -1;
  }
}
</style>
