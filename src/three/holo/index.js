import { WebGLRenderer } from 'three'
import { motionQuery, disposeTree } from '../palette.js'
import { coreView } from './coreView.js'
import { hackView } from './hackView.js'
import { pulseView } from './pulseView.js'
import { lensView } from './lensView.js'
import { mailView } from './mailView.js'

export const views = {
  core: coreView,
  hack: hackView,
  pulse: pulseView,
  lens: lensView,
  mail: mailView,
}

// One WebGL context for every hologram on the page. Each view renders into the
// bottom-left corner of an offscreen canvas and is copied straight into its own
// 2D canvas. The holograms are then ordinary elements: they scroll, tilt and
// clip with the card they sit in, and the page never holds more than one
// context for them.
export function createHoloStage() {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setScissorTest(true)

  const mq = motionQuery()
  let reduced = mq.matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)

  const views = new Set()
  let bufW = 0
  let bufH = 0
  let looping = false
  let paused = false
  let last = 0
  let time = 0

  // Grow-only: big enough for the largest view seen so far.
  function ensureBuffer(w, h) {
    if (w <= bufW && h <= bufH) return
    bufW = Math.max(bufW, Math.ceil(w))
    bufH = Math.max(bufH, Math.ceil(h))
    renderer.setSize(bufW, bufH, false)
  }

  function draw(v, dt) {
    const cw = v.canvas.clientWidth
    const ch = v.canvas.clientHeight
    if (!cw || !ch) return
    const pw = Math.round(cw * dpr)
    const ph = Math.round(ch * dpr)
    if (v.canvas.width !== pw || v.canvas.height !== ph) {
      v.canvas.width = pw
      v.canvas.height = ph
    }
    ensureBuffer(cw, ch)
    const aspect = cw / ch
    if (v.aspect !== aspect) {
      v.aspect = aspect
      v.built.camera.aspect = aspect
      v.built.camera.updateProjectionMatrix()
      v.built.resize?.(aspect)
    }
    v.built.update(dt, time, v.state)
    renderer.setViewport(0, 0, cw, ch)
    renderer.setScissor(0, 0, cw, ch)
    renderer.render(v.built.scene, v.built.camera)
    const src = renderer.domElement
    v.ctx.clearRect(0, 0, pw, ph)
    v.ctx.drawImage(src, 0, src.height - ph, pw, ph, 0, 0, pw, ph)
  }

  function tick(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.1) : 1 / 60
    last = t
    time += dt
    for (const v of views) if (v.visible) draw(v, dt)
  }

  function ensureLoop() {
    let anyVisible = false
    for (const v of views) if (v.visible) anyVisible = true
    const want = anyVisible && !paused && !reduced && !document.hidden
    if (want && !looping) {
      last = 0
      renderer.setAnimationLoop(tick)
      looping = true
    } else if (!want && looping) {
      renderer.setAnimationLoop(null)
      looping = false
    }
  }

  // Without a running loop (reduced motion, paused), redraw a single frame on demand.
  function still(v) {
    if (!looping && v.visible && !paused) draw(v, 0)
  }

  function add(canvas, factory, state = {}) {
    const ctx = canvas.getContext('2d')
    const built = factory({ dpr, reduced: () => reduced })
    const v = { canvas, ctx, built, state: { ...state }, visible: false, aspect: 0 }

    v.io = new IntersectionObserver(
      ([entry]) => {
        v.visible = entry.isIntersecting
        ensureLoop()
        still(v)
      },
      { rootMargin: '120px' },
    )
    v.io.observe(canvas)
    v.ro = new ResizeObserver(() => still(v))
    v.ro.observe(canvas)

    const listeners = []
    if (built.pointer) {
      for (const [type, fn] of Object.entries(built.pointer)) {
        const handler = (e) => {
          fn(e, canvas)
          still(v)
        }
        canvas.addEventListener(type, handler)
        listeners.push([type, handler])
      }
    }

    views.add(v)

    return {
      set(patch) {
        Object.assign(v.state, patch)
        still(v)
      },
      dispose() {
        v.io.disconnect()
        v.ro.disconnect()
        for (const [type, handler] of listeners) canvas.removeEventListener(type, handler)
        views.delete(v)
        built.dispose?.()
        disposeTree(built.scene)
        ensureLoop()
      },
    }
  }

  function onMotion(e) {
    reduced = e.matches
    ensureLoop()
    for (const v of views) still(v)
  }
  mq.addEventListener('change', onMotion)
  document.addEventListener('visibilitychange', ensureLoop)

  return {
    add,
    setPaused(value) {
      paused = value
      ensureLoop()
      if (!paused) for (const v of views) still(v)
    },
    dispose() {
      renderer.setAnimationLoop(null)
      mq.removeEventListener('change', onMotion)
      document.removeEventListener('visibilitychange', ensureLoop)
      for (const v of [...views]) {
        v.io.disconnect()
        v.ro.disconnect()
        disposeTree(v.built.scene)
      }
      views.clear()
      renderer.dispose()
    },
  }
}
