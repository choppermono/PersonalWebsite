import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  LineSegments,
  BoxGeometry,
  OctahedronGeometry,
  IcosahedronGeometry,
  RingGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  DoubleSide,
  Color,
  MathUtils,
} from 'three'
import { COLOR, ease } from '../palette.js'
import { addLights, edges, ring, lineGeo, makeProjector, makeScanner, makeTextRing, damp } from './kit.js'

const RED = new Color(COLOR.red)
const BONE = new Color(COLOR.bone)

// The operator's core: the emblem from the logo as geometry, standing in a
// projection chamber. Drag turns it, a click (no drag) starts hack mode.
export function coreView({ dpr, reduced, onActivate }) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 1.2, 0.1, 80)
  const look = { x: 0, y: 0.15, z: 0 }
  addLights(scene)

  const CORE_Y = 0.55

  // ---------- projection chamber ----------
  const projector = makeProjector({ radius: 2.05, height: 2.5, dpr, motes: 80 })
  projector.group.position.y = -2.05
  scene.add(projector.group)

  const scanner = makeScanner(2.35)
  scene.add(scanner.group)

  // ---------- the body the user can grab ----------
  const rig = new Group()
  rig.position.y = CORE_Y
  scene.add(rig)

  const heartMat = new MeshStandardMaterial({
    color: COLOR.bone,
    flatShading: true,
    roughness: 0.4,
    metalness: 0.05,
    emissive: COLOR.bone,
    emissiveIntensity: 0.14,
  })
  const heartGeo = new BoxGeometry(0.78, 0.78, 0.78)
  const heart = new Mesh(heartGeo, heartMat)
  heart.add(edges(heartGeo))
  rig.add(heart)

  // Seen head-on, the octahedron's outline is the rotated square of the logo.
  const shellLines = edges(new OctahedronGeometry(1.5), COLOR.bone)
  rig.add(shellLines)

  const cage = edges(new IcosahedronGeometry(1.95, 1), COLOR.bone, 0.16)
  rig.add(cage)

  const shieldRing = new Group()
  shieldRing.rotation.x = 1.15
  rig.add(shieldRing)
  const shieldMat = new MeshStandardMaterial({
    color: COLOR.bone,
    flatShading: true,
    roughness: 0.5,
    emissive: COLOR.red,
    emissiveIntensity: 0,
  })
  const shieldGeo = new BoxGeometry(0.2, 0.2, 0.2)
  const shields = []
  for (let i = 0; i < 8; i++) {
    const m = new Mesh(shieldGeo, shieldMat)
    shields.push(m)
    shieldRing.add(m)
  }

  // ---------- satellites on inclined orbits ----------
  const satGeo = new OctahedronGeometry(0.09)
  const satMat = new MeshBasicMaterial({ color: COLOR.bone })
  const sats = [0, 1, 2].map((i) => {
    const orbit = new Group()
    orbit.rotation.set(0.5 + i * 0.7, i * 1.3, 0.3 * i)
    orbit.position.y = CORE_Y
    const path = ring(3.05 + i * 0.18, { dashed: true, dash: 0.05, gap: 0.12, opacity: 0.28 })
    const sat = new Mesh(satGeo, satMat)
    orbit.add(path, sat)
    scene.add(orbit)
    return { orbit, sat, r: 3.05 + i * 0.18, speed: 0.35 + i * 0.17, phase: i * 2.1 }
  })

  // ---------- text band ----------
  const band = makeTextRing('HALLDOR PERSONAL · OPERATOR · UNIT 0-H · SECTOR 07 · CORE SYS · ', { radius: 2.7, repeat: 2 })
  const bandHolder = new Group()
  bandHolder.position.y = CORE_Y
  bandHolder.rotation.set(0.16, 0, -0.1)
  bandHolder.add(band)
  scene.add(bandHolder)

  // ---------- flat HUD layer, turned to face the camera ----------
  const hud = new Group()
  hud.position.y = CORE_Y
  scene.add(hud)

  const orbit = ring(2.45, { plane: 'xy', dashed: true, dash: 0.1, gap: 0.12, opacity: 0.55, segments: 128 })
  hud.add(orbit)
  hud.add(
    new LineSegments(
      lineGeo([0, 2.62, 0, 0, 3.05, 0, 0, -2.62, 0, 0, -3.05, 0, 2.62, 0, 0, 3.05, 0, 0, -2.62, 0, 0, -3.05, 0, 0]),
      new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.7 }),
    ),
  )
  const arcMat = new MeshBasicMaterial({ color: COLOR.red, transparent: true, opacity: 0.9, side: DoubleSide })
  const arcGeo = new RingGeometry(2.5, 2.57, 48, 1, 0, Math.PI * 0.36)
  const arcs = new Group()
  const arcB = new Mesh(arcGeo, arcMat)
  arcB.rotation.z = Math.PI
  arcs.add(new Mesh(arcGeo, arcMat), arcB)
  hud.add(arcs)
  const lockMat = new MeshBasicMaterial({ color: COLOR.red, transparent: true, opacity: 0, side: DoubleSide })
  const lock = new Mesh(new RingGeometry(2.0, 2.06, 64), lockMat)
  hud.add(lock)

  // ---------- framing ----------
  function resize(aspect) {
    // Narrow views step back so the text band never leaves the frame.
    const dist = aspect < 1.1 ? 12.4 : 10.8
    camera.position.set(0, 1.35, dist)
    camera.lookAt(look.x, look.y, look.z)
    hud.lookAt(camera.position)
  }
  resize(1.2)

  // ---------- state ----------
  let hover = 0
  let charge = 0
  let breach = 0
  let lockT = 1
  let chargeT = 1
  let seenLock = 0
  let seenCharge = 0
  const drag = { active: false, moved: 0, x: 0, y: 0, vx: 0, vy: 0, at: 0, id: null, over: false }

  function update(dt, time, state) {
    const still = reduced()
    if (state.lockAt && state.lockAt !== seenLock) {
      seenLock = state.lockAt
      lockT = 0
      shieldMat.emissiveIntensity = 0.9
    }
    if (state.chargeAt && state.chargeAt !== seenCharge) {
      seenCharge = state.chargeAt
      chargeT = 0
    }

    hover = damp(hover, drag.over || state.hover ? 1 : 0, 6, dt)
    breach = damp(breach, state.breached ? 1 : 0, 3, dt)
    if (chargeT < 1) {
      chargeT = Math.min(1, chargeT + dt / 0.7)
      charge = Math.sin(chargeT * Math.PI)
    } else charge = 0
    if (lockT < 1) {
      lockT = Math.min(1, lockT + dt / 0.62)
      lock.scale.setScalar(MathUtils.lerp(1.7, 1, ease.outCubic(lockT)))
      lockMat.opacity = (1 - lockT) * 0.95
    } else lockMat.opacity = 0

    const speed = still ? 0 : 1 + hover * 2.2 + charge * 6
    if (!drag.active && !still) {
      rig.rotation.y += (0.35 * speed + drag.vx) * dt
      rig.rotation.x += (0.12 * speed + drag.vy) * dt
      drag.vx *= Math.pow(0.05, dt)
      drag.vy *= Math.pow(0.05, dt)
    }
    heart.rotation.x -= dt * 0.9 * speed
    heart.rotation.z += dt * 0.6 * speed
    shellLines.rotation.y -= dt * 0.25 * speed
    shellLines.scale.setScalar(1 + charge * 0.35)
    cage.rotation.y += dt * 0.08 * speed
    shieldRing.rotation.z += dt * 0.7 * speed

    const r = 2.05 + Math.max(hover, charge) * 0.45
    shields.forEach((m, i) => {
      const a = (i / shields.length) * Math.PI * 2
      m.position.set(Math.cos(a) * r, Math.sin(a) * r, 0)
      m.rotation.x += dt * 1.8
      m.rotation.y += dt * 1.1
    })
    shieldMat.emissiveIntensity = Math.max(breach * 0.6, shieldMat.emissiveIntensity - dt * 2.5)

    heartMat.emissive.copy(BONE).lerp(RED, breach)
    heartMat.emissiveIntensity = 0.14 + charge * 0.8 + breach * 0.35 + (still ? 0 : Math.sin(time * 2) * 0.04)
    arcs.rotation.z += dt * (0.4 + hover * 1.2 + charge * 4) * (still ? 0 : 1)
    orbit.rotation.z -= dt * 0.12 * (still ? 0 : 1)
    band.rotation.y -= dt * (0.22 + hover * 0.5) * (still ? 0 : 1)

    for (const s of sats) {
      const a = s.phase + time * s.speed * (still ? 0 : 1)
      s.sat.position.set(Math.cos(a) * s.r, 0, Math.sin(a) * s.r)
      s.sat.rotation.y += dt * 2
    }

    // Laser sweep: bottom of the beam to above the core and back.
    const sweep = still ? 0.55 : (Math.sin(time * 1.9) + 1) / 2
    scanner.set(MathUtils.lerp(-1.6, 2.6, sweep), 0.35 + 0.65 * Math.sin(sweep * Math.PI))
    projector.update(still ? 0 : time, 0.55 + hover * 0.35 + charge * 0.6)
  }

  // ---------- pointer: drag to turn, click to activate ----------
  const pointer = {
    pointerdown(e, canvas) {
      drag.active = true
      drag.moved = 0
      drag.x = e.clientX
      drag.y = e.clientY
      drag.at = performance.now()
      drag.id = e.pointerId
      if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId)
    },
    pointermove(e) {
      if (!drag.active || e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.x = e.clientX
      drag.y = e.clientY
      drag.moved += Math.abs(dx) + Math.abs(dy)
      rig.rotation.y += dx * 0.012
      rig.rotation.x += dy * 0.012
      drag.vx = dx * 0.6
      drag.vy = dy * 0.6
    },
    pointerup(e, canvas) {
      if (!drag.active || e.pointerId !== drag.id) return
      drag.active = false
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      if (drag.moved < 8 && performance.now() - drag.at < 450) onActivate?.()
    },
    pointercancel() {
      drag.active = false
    },
    pointerenter() {
      drag.over = true
    },
    pointerleave() {
      drag.over = false
    },
  }

  return { scene, camera, update, resize, pointer }
}
