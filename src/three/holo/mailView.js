import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  LineSegments,
  Shape,
  ExtrudeGeometry,
  BoxGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  DoubleSide,
  MathUtils,
} from 'three'
import { COLOR, ease } from '../palette.js'
import { addLights, edges, lineGeo, makeProjector, damp } from './kit.js'

// Email: an envelope that opens, lifts its letter, and sends packets off.
export function mailView({ dpr, reduced }) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 2, 0.1, 60)
  addLights(scene)

  const FLOOR = -1.15
  const projector = makeProjector({ radius: 1.6, height: 1.6, dpr, motes: 36 })
  projector.group.position.y = FLOOR
  scene.add(projector.group)

  const env = new Group()
  env.position.y = 0.05
  scene.add(env)

  const W = 1.9
  const H = 1.2
  const paper = new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.55, side: DoubleSide })

  const bodyGeo = new BoxGeometry(W, H, 0.08)
  const body = new Mesh(bodyGeo, paper)
  body.add(edges(bodyGeo))
  env.add(body)

  // Front folds: the V from the bottom corners, plus the side creases.
  const folds = new LineSegments(
    lineGeo([
      -W / 2, -H / 2, 0.042, 0, 0.02, 0.042,
      W / 2, -H / 2, 0.042, 0, 0.02, 0.042,
      -W / 2, H / 2, 0.042, -0.18, 0.0, 0.042,
      W / 2, H / 2, 0.042, 0.18, 0.0, 0.042,
    ]),
    new LineBasicMaterial({ color: COLOR.ink, transparent: true, opacity: 0.55 }),
  )
  env.add(folds)

  // Letter: sits inside the body, rises once the flap is up.
  const letter = new Group()
  const letterMesh = new Mesh(
    new PlaneGeometry(1.55, 1.0),
    new MeshStandardMaterial({ color: 0xe9e5cf, roughness: 0.6, side: DoubleSide }),
  )
  const lines = []
  for (let i = 0; i < 4; i++) {
    const y = 0.28 - i * 0.16
    lines.push(-0.6, y, 0.004, i === 3 ? 0.1 : 0.6, y, 0.004)
  }
  letterMesh.add(new LineSegments(lineGeo(lines), new LineBasicMaterial({ color: COLOR.ink, transparent: true, opacity: 0.45 })))
  letter.add(letterMesh)
  letter.position.z = 0.015
  env.add(letter)

  // Flap: hinged on the top edge, hanging down over the front when closed.
  const flapShape = new Shape()
  flapShape.moveTo(-W / 2, 0)
  flapShape.lineTo(W / 2, 0)
  flapShape.lineTo(0, -0.7)
  flapShape.closePath()
  const flapGeo = new ExtrudeGeometry(flapShape, { depth: 0.02, bevelEnabled: false })
  const flapMesh = new Mesh(flapGeo, paper)
  flapMesh.add(edges(flapGeo))
  const flap = new Group()
  flap.position.set(0, H / 2, 0.045)
  flap.add(flapMesh)
  env.add(flap)

  // Packets leaving the letter.
  const packetGeo = new BoxGeometry(0.07, 0.07, 0.07)
  const packetMats = [new MeshBasicMaterial({ color: COLOR.bone }), new MeshBasicMaterial({ color: COLOR.red })]
  const packets = Array.from({ length: 14 }, (_, i) => {
    const m = new Mesh(packetGeo, packetMats[i % 3 === 0 ? 1 : 0])
    m.visible = false
    env.add(m)
    return { m, on: false, t: 0, sx: 0, speed: 1 }
  })

  function resize(aspect) {
    const dist = aspect < 1.5 ? 8 : 6.6
    camera.position.set(0, 1.4, dist)
    camera.lookAt(0, -0.05, 0)
  }
  resize(2)

  let hover = 0
  let openness = 0
  let emitT = 0

  function update(dt, time, state) {
    const still = reduced()
    hover = damp(hover, state.hover ? 1 : 0, 6, dt)

    // Idle: a slow cycle of open and closed. Hover holds it open.
    const cycle = (time % 6) / 6
    const idleOpen = cycle < 0.2 ? 0 : cycle < 0.35 ? (cycle - 0.2) / 0.15 : cycle < 0.8 ? 1 : cycle < 0.95 ? 1 - (cycle - 0.8) / 0.15 : 0
    const want = still ? 1 : Math.max(idleOpen, hover)
    openness = still ? 1 : damp(openness, want, 4, dt)

    // First half of the opening swings the flap, the second half lifts the letter.
    const flapT = ease.inOutCubic(MathUtils.clamp(openness * 2, 0, 1))
    const liftT = ease.outCubic(MathUtils.clamp(openness * 2 - 1, 0, 1))
    flap.rotation.x = -3.45 * flapT
    letter.position.y = liftT * 0.78

    emitT -= dt
    if (!still && liftT > 0.9 && emitT <= 0) {
      emitT = hover > 0.5 ? 0.09 : 0.22
      const p = packets.find((x) => !x.on)
      if (p) {
        p.on = true
        p.t = 0
        p.sx = (Math.random() - 0.5) * 0.9
        p.speed = 0.8 + Math.random() * 0.6
        p.m.visible = true
      }
    }
    for (const p of packets) {
      if (!p.on) continue
      p.t += dt * p.speed
      if (p.t >= 1) {
        p.on = false
        p.m.visible = false
        continue
      }
      // Out of the letter's top edge, arcing up and away to the right.
      p.m.position.set(p.sx + p.t * 1.3, 1.25 + p.t * 0.9 - p.t * p.t * 0.35, 0.05 + p.t * 0.4)
      p.m.rotation.set(p.t * 6, p.t * 4, 0)
      p.m.scale.setScalar(1 - p.t)
    }

    if (!still) {
      env.rotation.y = Math.sin(time * 0.6) * 0.38
      env.rotation.x = -0.08 + Math.sin(time * 0.9) * 0.04
      env.position.y = 0.05 + Math.sin(time * 1.4) * 0.05
    } else {
      env.rotation.set(-0.08, 0.28, 0)
    }
    projector.update(still ? 0 : time, 0.5 + hover * 0.4)
  }

  return { scene, camera, update, resize }
}
