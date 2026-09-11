// Pointer-driven 3D tilt with a glare highlight, written to CSS variables:
// --rx / --ry (degrees) and --gx / --gy (glare position, %). Mouse only, and
// off entirely when the viewer prefers reduced motion.
export function useTilt(getEl, { max = 6 } = {}) {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0

  function move(e) {
    const el = getEl()
    if (!el || !fine.matches || calm.matches) return
    const x = e.clientX
    const y = e.clientY
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      const px = (x - r.left) / r.width
      const py = (y - r.top) / r.height
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${((px - 0.5) * max * 1.2).toFixed(2)}deg`)
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
    })
  }

  function reset() {
    cancelAnimationFrame(frame)
    const el = getEl()
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return { move, reset }
}
