import { CanvasTexture, SRGBColorSpace, Vector3 } from 'three'

// Mirrors the tokens in style.css. Hex values are sRGB.
export const COLOR = {
  void: 0x100f0d,
  ink: 0x0b0a08,
  floor: 0x16150f,
  hull: 0x1d1b16,
  bone: 0xdcd8c0,
  boneDim: 0xa9a48a,
  red: 0xe0574f,
  redDeep: 0xbc3f3c,
}

// Custom shaders bypass three's colour management, so they take sRGB directly.
export function srgb(hex) {
  return new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255)
}

// Soft round sprite for glows. Each renderer builds its own copy.
export function makeGlowTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.28, 'rgba(255,255,255,0.42)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

// Live query, so a mid-session OS change is respected.
export function motionQuery() {
  return window.matchMedia('(prefers-reduced-motion: reduce)')
}

export const ease = {
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
}

// Tiny tween runner driven by the render loop, so it pauses with it.
export function createTweens() {
  const list = []
  return {
    add(duration, onUpdate, onDone) {
      const tw = { t: 0, duration, onUpdate, onDone }
      list.push(tw)
      return tw
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const tw = list[i]
        tw.t = Math.min(1, tw.t + (dt * 1000) / tw.duration)
        tw.onUpdate(tw.t)
        if (tw.t >= 1) {
          list.splice(i, 1)
          tw.onDone?.()
        }
      }
    },
    clear() {
      list.length = 0
    },
  }
}

// Free every geometry, material and texture under an object.
export function disposeTree(root) {
  root.traverse((obj) => {
    obj.geometry?.dispose()
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
    for (const m of mats) {
      for (const value of Object.values(m)) if (value?.isTexture) value.dispose()
      m.dispose()
    }
  })
}
