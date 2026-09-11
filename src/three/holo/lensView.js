import {
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  LineSegments,
  Shape,
  Path,
  ExtrudeGeometry,
  TorusGeometry,
  IcosahedronGeometry,
  CircleGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  MathUtils,
} from 'three'
import { COLOR } from '../palette.js'
import { addLights, edges, ring, makeProjector, damp } from './kit.js'

const TAU = Math.PI * 2

function roundedRect(target, x, y, w, h, r) {
  target.moveTo(x + r, y)
  target.lineTo(x + w - r, y)
  target.quadraticCurveTo(x + w, y, x + w, y + r)
  target.lineTo(x + w, y + h - r)
  target.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  target.lineTo(x + r, y + h)
  target.quadraticCurveTo(x, y + h, x, y + h - r)
  target.lineTo(x, y + r)
  target.quadraticCurveTo(x, y, x + r, y)
}

// Instagram: the camera glyph as a solid frame, with a lens whose iris opens on hover.
export function lensView({ dpr, reduced }) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 2, 0.1, 60)
  addLights(scene)

  const FLOOR = -1.15
  const projector = makeProjector({ radius: 1.55, height: 1.7, dpr, motes: 36 })
  projector.group.position.y = FLOOR
  scene.add(projector.group)

  const icon = new Group()
  icon.position.y = 0.2
  scene.add(icon)

  // Body: a rounded square with a rounded-square hole, extruded.
  const S = 2
  const outer = new Shape()
  roundedRect(outer, -S / 2, -S / 2, S, S, 0.56)
  const hole = new Path()
  const inset = 0.16
  roundedRect(hole, -S / 2 + inset, -S / 2 + inset, S - inset * 2, S - inset * 2, 0.42)
  outer.holes.push(hole)
  const bodyGeo = new ExtrudeGeometry(outer, { depth: 0.16, bevelEnabled: false, curveSegments: 10 })
  bodyGeo.translate(0, 0, -0.08)
  const body = new Mesh(
    bodyGeo,
    new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.42, metalness: 0.06 }),
  )
  body.add(edges(bodyGeo, COLOR.ink, 0.6))
  icon.add(body)

  // Lens barrel: a solid ring, then two thinner rings stepping back.
  const lensRingGeo = new TorusGeometry(0.5, 0.075, 10, 64)
  const lensRing = new Mesh(
    lensRingGeo,
    new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.4 }),
  )
  icon.add(lensRing)
  const barrelA = ring(0.4, { plane: 'xy', opacity: 0.8 })
  barrelA.position.z = -0.08
  const barrelB = ring(0.3, { plane: 'xy', opacity: 0.55, dashed: true, dash: 0.04, gap: 0.04 })
  barrelB.position.z = -0.16
  icon.add(barrelA, barrelB)

  const glass = new Mesh(
    new CircleGeometry(0.43, 48),
    new MeshBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.06, depthWrite: false, blending: AdditiveBlending }),
  )
  glass.position.z = 0.01
  icon.add(glass)

  // Iris: a heptagon with blade edges swept out to the rim.
  const K = 7
  const irisPos = new Float32Array(K * 4 * 3)
  const irisGeo = new BufferGeometry()
  irisGeo.setAttribute('position', new Float32BufferAttribute(irisPos, 3))
  const iris = new LineSegments(irisGeo, new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.9 }))
  iris.frustumCulled = false
  iris.position.z = -0.02
  icon.add(iris)

  function drawIris(open, spin) {
    const rIn = MathUtils.lerp(0.09, 0.33, open)
    const rOut = 0.43
    let k = 0
    const put = (x, y) => {
      irisPos[k++] = x
      irisPos[k++] = y
      irisPos[k++] = 0
    }
    for (let i = 0; i < K; i++) {
      const a0 = spin + (i / K) * TAU
      const a1 = spin + ((i + 1) / K) * TAU
      put(Math.cos(a0) * rIn, Math.sin(a0) * rIn)
      put(Math.cos(a1) * rIn, Math.sin(a1) * rIn)
      const b = a0 + 0.45 + (1 - open) * 1.05
      put(Math.cos(a0) * rIn, Math.sin(a0) * rIn)
      put(Math.cos(b) * rOut, Math.sin(b) * rOut)
    }
    irisGeo.attributes.position.needsUpdate = true
  }

  // The dot in the corner, lit red like a recording light.
  const dotMat = new MeshBasicMaterial({ color: COLOR.red })
  const dot = new Mesh(new IcosahedronGeometry(0.1, 1), dotMat)
  dot.position.set(0.54, 0.54, 0.02)
  icon.add(dot)

  const flashMat = new MeshBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
  const flash = new Mesh(new CircleGeometry(1.4, 48), flashMat)
  flash.position.z = 0.05
  icon.add(flash)

  function resize(aspect) {
    const dist = aspect < 1.5 ? 8 : 6.6
    camera.position.set(0, 1.5, dist)
    camera.lookAt(0, -0.1, 0)
  }
  resize(2)

  let hover = 0
  let open = 0.3
  let flashT = 1
  let wasHot = false

  function update(dt, time, state) {
    const still = reduced()
    const hot = !!state.hover
    if (hot && !wasHot && !still) flashT = 0
    wasHot = hot
    hover = damp(hover, hot ? 1 : 0, 6, dt)

    // At rest the iris breathes; on hover it opens right up.
    const breathe = still ? 0.35 : 0.3 + Math.sin(time * 1.3) * 0.15
    open = damp(open, Math.max(breathe, hover), 5, dt)
    drawIris(open, still ? 0 : time * 0.4 + hover * 1.5)

    if (!still) {
      icon.rotation.y = Math.sin(time * 0.7) * 0.42
      icon.rotation.x = -0.12 + Math.sin(time * 0.5) * 0.05
      lensRing.rotation.z += dt * (0.3 + hover * 2)
      barrelB.rotation.z -= dt * (0.5 + hover * 2.5)
    } else {
      icon.rotation.set(-0.12, 0.3, 0)
    }

    if (flashT < 1) {
      flashT = Math.min(1, flashT + dt / 0.45)
      flash.scale.setScalar(0.3 + flashT * 0.9)
      flashMat.opacity = (1 - flashT) * 0.5
    } else flashMat.opacity = 0

    dotMat.color.setHex(still || Math.sin(time * 4) > -0.3 ? COLOR.red : COLOR.redDeep)
    projector.update(still ? 0 : time, 0.5 + hover * 0.4)
  }

  return { scene, camera, update, resize }
}
