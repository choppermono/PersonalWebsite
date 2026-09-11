// v-reveal: fades an element up the first time it scrolls into view.
// v-reveal="120" delays it by 120 ms, for staggering siblings.
// One observer for the whole page; the look lives in style.css (.reveal), and
// reduced motion shows everything in its final state from the start.
let io = null

function observer() {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  )
  return io
}

export const vReveal = {
  mounted(el, { value }) {
    el.classList.add('reveal')
    if (value) el.style.setProperty('--reveal-delay', `${value}ms`)
    observer().observe(el)
  },
  unmounted(el) {
    io?.unobserve(el)
  },
}
