import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  LineSegments,
  Shape,
  ExtrudeGeometry,
  IcosahedronGeometry,
  BoxGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
} from 'three'
import { COLOR } from '../palette.js'
import { addLights, edges, ring, lineGeo, makeProjector, softDisc, damp } from './kit.js'

// NieR Hack Game: a one-core skirmish on a hacking floor.
export function hackView({ dpr, reduced }) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 2, 0.1, 60)
  addLights(scene)

  const FLOOR = -0.9
  const projector = makeProjector({ radius: 1.75, height: 1.5, dpr, motes: 40 })
  projector.group.position.y = FLOOR
  scene.add(projector.group)

  // Arena grid inside the projector disc.
  const grid = []
  const S = 1.3
  for (let i = -4; i <= 4; i++) {
    const v = (i / 4) * S
    grid.push(-S, 0, v, S, 0, v, v, 0, -S, v, 0, S)
  }
  const gridLines = new LineSegments(lineGeo(grid), new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.14 }))
  gridLines.position.y = FLOOR + 0.01
  scene.add(gridLines)

  // ---------- core ----------
  const core = new Group()
  core.position.set(0.78, 0.02, -0.05)
  scene.add(core)
  const hullMat = new MeshStandardMaterial({
    color: COLOR.hull,
    flatShading: true,
    roughness: 0.5,
    metalness: 0.15,
    emissive: COLOR.bone,
    emissiveIntensity: 0,
  })
  const hullGeo = new IcosahedronGeometry(0.42, 0)
  const hull = new Mesh(hullGeo, hullMat)
  hull.add(edges(hullGeo, COLOR.bone))
  core.add(hull)
  const threat = ring(0.98, { color: COLOR.red, dashed: true, dash: 0.08, gap: 0.06, opacity: 0.7 })
  threat.position.y = FLOOR - core.position.y + 0.02
  core.add(threat)

  const shieldMat = new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.5 })
  const shieldGeo = new BoxGeometry(0.13, 0.13, 0.13)
  const shields = Array.from({ length: 5 }, (_, i) => {
    const m = new Mesh(shieldGeo, shieldMat)
    core.add(m)
    return { m, a: (i / 5) * Math.PI * 2 }
  })

  // ---------- ship ----------
  const shape = new Shape()
  shape.moveTo(0, 0.64)
  shape.lineTo(0.44, -0.44)
  shape.lineTo(0, -0.16)
  shape.lineTo(-0.44, -0.44)
  shape.closePath()
  const shipGeo = new ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false }).rotateX(-Math.PI / 2)
  const ship = new Group()
  ship.rotation.y = -Math.PI / 2 // nose toward +x, at the core
  const shipBody = new Group()
  const shipMesh = new Mesh(
    shipGeo,
    new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.45, emissive: COLOR.bone, emissiveIntensity: 0.2 }),
  )
  shipBody.add(shipMesh, edges(shipGeo))
  shipBody.scale.setScalar(0.5)
  shipBody.rotation.z = 0.45
  const shipGlow = softDisc(0.45, COLOR.bone, 0.18)
  shipGlow.rotation.x = -Math.PI / 2
  shipGlow.position.y = -0.2
  ship.add(shipBody, shipGlow)
  ship.position.set(-1.25, 0.02, 0)
  scene.add(ship)

  // ---------- projectiles (fixed pools, reused) ----------
  const shotGeo = new BoxGeometry(0.22, 0.045, 0.045)
  const shotMat = new MeshBasicMaterial({ color: COLOR.bone })
  const shots = Array.from({ length: 16 }, () => {
    const m = new Mesh(shotGeo, shotMat)
    m.visible = false
    scene.add(m)
    return { m, on: false, x: 0, z: 0 }
  })
  const orbGeo = new IcosahedronGeometry(0.065, 1)
  const orbMat = new MeshBasicMaterial({ color: COLOR.red })
  const orbs = Array.from({ length: 32 }, () => {
    const m = new Mesh(orbGeo, orbMat)
    m.visible = false
    scene.add(m)
    return { m, on: false, x: 0, z: 0, vx: 0, vz: 0, life: 0 }
  })

  // Steep, like the arena camera in the real game: the floor and the flat ship read from above.
  const CAM_Y = 3.7
  const LOOK_Y = -0.35
  function resize(aspect) {
    const dist = aspect < 1.5 ? 6.6 : 5.3
    camera.position.set(0, CAM_Y, dist)
    camera.lookAt(0, LOOK_Y, 0)
  }
  resize(2)

  // A composed still for reduced motion: a shot stream mid-flight and one ring of orbs.
  function pose() {
    shots.forEach((s, i) => {
      s.on = i < 4
      s.m.visible = s.on
      s.m.position.set(-0.9 + i * 0.36, 0.02, (i % 2 ? 0.05 : -0.05))
    })
    orbs.forEach((o, i) => {
      o.on = i < 8
      o.m.visible = o.on
      const a = (i / 8) * Math.PI * 2
      o.m.position.set(core.position.x + Math.cos(a) * 0.75, 0.02, core.position.z + Math.sin(a) * 0.75)
      o.m.scale.setScalar(1)
    })
  }

  let hover = 0
  let fireT = 0
  let ringT = 0.4
  let ringOffset = 0
  let flash = 0
  let side = 1
  let posed = false

  function update(dt, time, state) {
    hover = damp(hover, state.hover ? 1 : 0, 6, dt)

    if (reduced()) {
      if (!posed) {
        pose()
        posed = true
      }
      shields.forEach((s) => s.m.position.set(Math.cos(s.a) * 0.72, 0, Math.sin(s.a) * 0.72))
      projector.update(0, 0.6)
      return
    }
    posed = false

    // Ship strafes and banks; the camera drifts a touch.
    ship.position.z = Math.sin(time * 1.4) * 0.5
    ship.position.y = 0.02 + Math.sin(time * 3) * 0.03
    // Rolled toward the camera a little, so the arrowhead shows its face while it banks.
    shipBody.rotation.z = 0.45 - Math.cos(time * 1.4) * 0.3
    camera.position.x = Math.sin(time * 0.3) * 0.35
    camera.lookAt(0, LOOK_Y, 0)

    fireT -= dt
    if (fireT <= 0) {
      fireT = hover > 0.5 ? 0.07 : 0.15
      const s = shots.find((x) => !x.on)
      if (s) {
        side = -side
        s.on = true
        s.x = ship.position.x + 0.25
        s.z = ship.position.z + side * 0.06
        s.m.visible = true
      }
    }
    for (const s of shots) {
      if (!s.on) continue
      s.x += 5.2 * dt
      // Aim converges on the core's lane as it flies.
      s.z += (core.position.z - s.z) * Math.min(1, dt * 2.5)
      if (s.x >= core.position.x - 0.42) {
        s.on = false
        s.m.visible = false
        flash = 1
        continue
      }
      s.m.position.set(s.x, 0.02, s.z)
    }

    ringT -= dt
    if (ringT <= 0) {
      ringT = hover > 0.5 ? 0.6 : 1.15
      const n = 8
      for (let i = 0; i < n; i++) {
        const o = orbs.find((x) => !x.on)
        if (!o) break
        const a = ringOffset + (i / n) * Math.PI * 2
        o.on = true
        o.x = core.position.x
        o.z = core.position.z
        o.vx = Math.cos(a) * 0.95
        o.vz = Math.sin(a) * 0.95
        o.life = 1.6
        o.m.visible = true
      }
      ringOffset += 0.3
    }
    for (const o of orbs) {
      if (!o.on) continue
      o.life -= dt
      o.x += o.vx * dt
      o.z += o.vz * dt
      if (o.life <= 0) {
        o.on = false
        o.m.visible = false
        continue
      }
      o.m.position.set(o.x, 0.02, o.z)
      o.m.scale.setScalar(Math.min(1, o.life * 2, (1.6 - o.life) * 8))
    }

    hull.rotation.x += dt * 0.7 * (1 + hover)
    hull.rotation.y += dt * 1.1 * (1 + hover)
    const r = 0.72 + hover * 0.22
    for (const s of shields) {
      s.a += dt * (1.6 + hover * 2.5)
      s.m.position.set(Math.cos(s.a) * r, Math.sin(s.a * 2) * 0.06, Math.sin(s.a) * r)
      s.m.rotation.x += dt * 2
      s.m.rotation.y += dt * 1.4
    }
    threat.rotation.y -= dt * 0.6
    flash = Math.max(0, flash - dt * 6)
    hullMat.emissiveIntensity = flash * 0.8
    projector.update(time, 0.5 + hover * 0.4)
  }

  return { scene, camera, update, resize }
}
