import {
  Group,
  Mesh,
  Points,
  LineSegments,
  LineLoop,
  BufferGeometry,
  Float32BufferAttribute,
  CylinderGeometry,
  CircleGeometry,
  EdgesGeometry,
  ShaderMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  LineDashedMaterial,
  HemisphereLight,
  DirectionalLight,
  CanvasTexture,
  SRGBColorSpace,
  AdditiveBlending,
  DoubleSide,
  FrontSide,
} from 'three'
import { COLOR, srgb } from '../palette.js'

export function addLights(scene, strength = 1) {
  scene.add(new HemisphereLight(0xfffbea, 0x2a2820, 1.3 * strength))
  const key = new DirectionalLight(0xffffff, 1.9 * strength)
  key.position.set(3, 5, 4)
  scene.add(key)
}

export function lineGeo(points) {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(points, 3))
  return g
}

export function edges(geometry, color = COLOR.ink, opacity = 1) {
  return new LineSegments(
    new EdgesGeometry(geometry),
    new LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  )
}

// A circle in the XZ plane (plane: 'xy' for one facing the camera).
export function ring(radius, { segments = 96, color = COLOR.bone, opacity = 1, dashed = false, dash = 0.1, gap = 0.1, plane = 'xz' } = {}) {
  const pts = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const c = Math.cos(a) * radius
    const s = Math.sin(a) * radius
    if (plane === 'xz') pts.push(c, 0, s)
    else pts.push(c, s, 0)
  }
  const material = dashed
    ? new LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity })
    : new LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  const line = new LineLoop(lineGeo(pts), material)
  if (dashed) line.computeLineDistances()
  return line
}

// ---------- projector: the lit floor disc and beam every hologram stands on ----------

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fade = pow(1.0 - vUv.y, 1.7);
    float rim = pow(1.0 - abs(dot(vNormal, vView)), 1.4);
    float bands = 0.72 + 0.28 * sin(vUv.y * 46.0 - uTime * 3.2);
    float a = fade * (0.18 + rim * 0.82) * bands * uStrength;
    gl_FragColor = vec4(uColor, a);
  }
`

const MOTE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uHeight;
  uniform float uRadius;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    float t = fract(aSeed * 13.7 + uTime * (0.07 + fract(aSeed * 7.3) * 0.12));
    float ang = aSeed * 56.5486;
    float r = uRadius * (0.2 + 0.75 * t) * (0.3 + 0.7 * fract(aSeed * 3.1));
    vec3 p = vec3(cos(ang) * r, t * uHeight, sin(ang) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = sin(t * 3.14159);
    gl_PointSize = (1.4 + fract(aSeed * 5.1) * 2.2) * uPixelRatio;
  }
`

const MOTE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.85;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

export function makeProjector({ radius = 1.6, height = 2.2, color = COLOR.bone, motes = 60, dpr = 1 } = {}) {
  const group = new Group()

  group.add(
    ring(radius, { opacity: 0.6 }),
    ring(radius * 0.74, { opacity: 0.4, dashed: true, dash: 0.07, gap: 0.07 }),
    ring(radius * 0.42, { opacity: 0.55 }),
  )

  const ticks = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const r0 = radius * 1.05
    const r1 = radius * (i % 4 === 0 ? 1.16 : 1.09)
    ticks.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1)
  }
  group.add(new LineSegments(lineGeo(ticks), new LineBasicMaterial({ color, transparent: true, opacity: 0.5 })))

  const floor = new Mesh(
    new CircleGeometry(radius, 64).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.05, depthWrite: false, blending: AdditiveBlending }),
  )
  group.add(floor)

  const beamMat = new ShaderMaterial({
    uniforms: { uColor: { value: srgb(color) }, uStrength: { value: 0.5 }, uTime: { value: 0 } },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  })
  const beam = new Mesh(new CylinderGeometry(radius * 0.95, radius * 0.22, height, 48, 1, true), beamMat)
  beam.position.y = height / 2
  group.add(beam)

  const seeds = new Float32Array(motes)
  for (let i = 0; i < motes; i++) seeds[i] = Math.random()
  const moteGeo = new BufferGeometry()
  moteGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(motes * 3), 3))
  moteGeo.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1))
  const moteMat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: height },
      uRadius: { value: radius },
      uPixelRatio: { value: dpr },
      uColor: { value: srgb(color) },
    },
    vertexShader: MOTE_VERT,
    fragmentShader: MOTE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const mote = new Points(moteGeo, moteMat)
  mote.frustumCulled = false
  group.add(mote)

  return {
    group,
    update(time, strength) {
      beamMat.uniforms.uTime.value = time
      beamMat.uniforms.uStrength.value = strength
      moteMat.uniforms.uTime.value = time
      floor.material.opacity = 0.04 + strength * 0.05
    },
  }
}

// ---------- a horizontal laser that sweeps up and down through the object ----------

export function makeScanner(radius, color = COLOR.red) {
  const group = new Group()
  const line = ring(radius, { color, opacity: 0.9 })
  const disc = new Mesh(
    new CircleGeometry(radius, 64).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }),
  )
  group.add(line, disc)
  return {
    group,
    // p in [0, 1] along the sweep; the plane fades at both ends
    set(y, fade) {
      group.position.y = y
      line.material.opacity = 0.9 * fade
      disc.material.opacity = 0.08 * fade
    },
  }
}

// ---------- a band of monospace text wrapped around a cylinder ----------

export function makeTextRing(text, { radius = 2.6, repeat = 2, color = '#dcd8c0', opacity = 0.85 } = {}) {
  const W = 4096
  const H = 64
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4

  function draw() {
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = color
    ctx.font = '500 42px "JetBrains Mono", ui-monospace, Consolas, monospace'
    ctx.textBaseline = 'middle'
    const chars = [...text]
    const unit = W / repeat
    const step = unit / chars.length
    for (let r = 0; r < repeat; r++) {
      chars.forEach((ch, i) => ctx.fillText(ch, r * unit + i * step, H / 2 + 2))
    }
    texture.needsUpdate = true
  }
  draw()
  // Redraw once the real face has loaded; the first pass may have used the fallback.
  document.fonts?.load('500 42px "JetBrains Mono"').then(draw, () => {})

  // Band height matches the texture's aspect around the circumference, so glyphs aren't stretched.
  const height = (2 * Math.PI * radius * H) / W
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, height, 160, 1, true),
    new MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false, side: FrontSide }),
  )
  return mesh
}

// Soft radial falloff used for flashes and glows.
export function softDisc(radius, color, opacity) {
  return new Mesh(
    new CircleGeometry(radius, 48),
    new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending }),
  )
}

export const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt))
