<script setup>
import { identity, sections } from '../data/profile.js'
</script>

<template>
  <footer class="foot">
    <div class="wrap">
      <p class="foot__mark" aria-hidden="true">Halldor</p>

      <div class="foot__row">
        <span class="label foot__name">{{ identity.operator }}</span>
        <nav class="foot__links" aria-label="Footer">
          <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" class="label foot__link">{{ s.label }}</a>
          <a href="#top" class="label foot__link">
            Back to top
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M12 19V5" />
              <path d="m6 11 6-6 6 6" />
            </svg>
          </a>
        </nav>
      </div>

      <div class="foot__row foot__row--sub">
        <span class="label foot__keys">
          <span><kbd>Tab</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Connect</span>
          <span><kbd>Esc</kbd> Leave hack</span>
        </span>
        <span class="label foot__build">{{ identity.build }} &middot; Vue + three.js</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.foot {
  position: relative;
  padding: clamp(56px, 8vw, 96px) 0 28px;
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(16, 15, 13, 0) 0%, rgba(16, 15, 13, 0.7) 60%);
  overflow: hidden;
}

/* The name as a wordmark across the full column, outlined so it reads as a watermark. */
.foot__mark {
  margin: 0 0 clamp(24px, 4vw, 48px);
  font-family: var(--display);
  /* Sized so all seven letters fit the column at any width. */
  font-size: clamp(3.5rem, 14.5vw, 14.5rem);
  font-weight: 300;
  line-height: 0.82;
  letter-spacing: 0.04em;
  margin-right: -0.04em;
  text-transform: uppercase;
  text-align: center;
  color: transparent;
  -webkit-text-stroke: 1px rgba(220, 216, 192, 0.28);
  user-select: none;
}

.foot__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding-block: 14px;
  border-top: 1px solid var(--line);
}

.foot__name {
  color: var(--bone);
}

.foot__links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
}

.foot__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  transition: color var(--fast) var(--ease);
}

.foot__link:hover {
  color: var(--bone);
}

.foot__link svg {
  width: 14px;
  height: 14px;
}

.foot__row--sub {
  color: var(--bone-mute);
}

.foot__keys {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.foot__keys span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (hover: none) {
  .foot__keys {
    display: none;
  }
}
</style>
