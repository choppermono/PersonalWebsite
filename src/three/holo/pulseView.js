import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  LineLoop,
  CylinderGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
} from 'three'
import { COLOR } from '../palette.js'
import { addLights, edges, makeProjector, damp } from './kit.js'

const RED = new Color(COLOR.red)
const BONE = new Color(COLOR.bone)

// A stylised heartbeat for x in [0, 1): P wave, QRS complex, T wave.
function beat(x) {
  const g = (m, s, a) => a * Math.exp(-((x - m) ** 2) / (2 * s * s))
  return g(0.16, 0.03, 0.14) - g(0.3, 0.012, 0.2) + g(0.335, 0.012, 1) - g(0.37, 0.012, 0.32) + g(0.6, 0.055, 0.26)
}

// Trackify: a dumbbell turning inside a heart monitor bent into a circle.
export function pulseView({ dpr, reduced }) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 2, 0.1, 60)
  addLights(scene)

  const FLOOR = -0.95
  const projector = makeProjector({ radius: 1.7, height: 1.6, dpr, motes: 40 })
  projector.group.position.y = FLOOR
  scene.add(projector.group)

  // ---------- dumbbell ----------
  const bell = new Group()
  bell.position.y = 0.05
  scene.add(bell)
  const boneMat = new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.42, metalness: 0.08 })
  const plateMat = new MeshStandardMaterial({
    color: COLOR.bone,
    flatShading: true,
    roughness: 0.45,
    emissive: COLOR.red,
    emissiveIntensity: 0,
  })
  const barGeo = new CylinderGeometry(0.045, 0.045, 1.75, 10).rotateZ(Math.PI / 2)
  const bar = new Mesh(barGeo, boneMat)
  bell.add(bar)
  const parts = [
    [0.5, 0.3, 0.13],
    [0.66, 0.24, 0.1],
    [0.79, 0.07, 0.08],
  ]
  for (const [x, r, h] of parts) {
    for (const s of [-1, 1]) {
      const geo = new CylinderGeometry(r, r, h, 8).rotateZ(Math.PI / 2)
      const m = new Mesh(geo, r > 0.1 ? plateMat : boneMat)
      m.position.x = x * s
      m.add(edges(geo))
      bell.add(m)
    }
  }

  // ---------- circular ECG ----------
  const N = 360
  const R = 1.32
  const positions = new Float32Array(N * 3)
  const ecgGeo = new BufferGeometry()
  ecgGeo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const ecgMat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.9 })
  const ecg = new LineLoop(ecgGeo, ecgMat)
  ecg.frustumCulled = false
  const ecgHolder = new Group()
  ecgHolder.rotation.x = 0.32
  ecgHolder.add(ecg)
  scene.add(ecgHolder)

  const blip = new Mesh(new IcosahedronGeometry(0.06, 1), new MeshBasicMaterial({ color: COLOR.red }))
  ecgHolder.add(blip)

  const BEATS = 3
  function drawEcg(phase) {
    let peak = -1
    let peakA = 0
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const x = (((a / (Math.PI * 2)) * BEATS - phase) % 1 + 1) % 1
      const v = beat(x)
      if (v > peak) {
        peak = v
        peakA = a
      }
      // Up is outward: the trace bulges off the circle on every beat.
      const r = R + v * 0.34
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = v * 0.12
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    ecgGeo.attributes.position.needsUpdate = true
    blip.position.set(Math.cos(peakA) * (R + 0.34), 0.12, Math.sin(peakA) * (R + 0.34))
  }

  function resize(aspect) {
    const dist = aspect < 1.5 ? 7.6 : 6.3
    camera.position.set(0, 2.1, dist)
    camera.lookAt(0, -0.15, 0)
  }
  resize(2)

  let hover = 0
  let phase = 0
  let pulse = 0
  let lastBeat = 0

  function update(dt, time, state) {
    hover = damp(hover, state.hover ? 1 : 0, 6, dt)
    const still = reduced()
    const bpm = 64 + hover * 46
    if (!still) phase += (dt * bpm) / 60 / BEATS
    drawEcg(still ? 0.1 : phase)

    // A beat lands each time the phase crosses a whole beat.
    const beatIndex = Math.floor(phase * BEATS)
    if (beatIndex !== lastBeat) {
      lastBeat = beatIndex
      pulse = 1
    }
    pulse = Math.max(0, pulse - dt * 4)

    if (!still) {
      bell.rotation.y += dt * (0.5 + hover * 1.3)
      bell.rotation.z = Math.sin(time * 0.8) * 0.18
      ecgHolder.rotation.y -= dt * 0.15
    } else {
      bell.rotation.set(0, 0.6, 0.12)
    }
    bell.scale.setScalar(1 + pulse * 0.06)
    plateMat.emissiveIntensity = pulse * 0.7
    ecgMat.color.copy(BONE).lerp(RED, pulse * 0.6)
    projector.update(still ? 0 : time, 0.5 + hover * 0.4 + pulse * 0.25)
  }

  return { scene, camera, update, resize }
}
