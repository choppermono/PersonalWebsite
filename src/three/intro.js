import {
  Group,
  Mesh,
  LineSegments,
  LineLoop,
  InstancedMesh,
  Object3D,
  BufferGeometry,
  Float32BufferAttribute,
  CylinderGeometry,
  BoxGeometry,
  OctahedronGeometry,
  IcosahedronGeometry,
  RingGeometry,
  EdgesGeometry,
  Sprite,
  SpriteMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  RepeatWrapping,
  AdditiveBlending,
  BackSide,
  DoubleSide,
  Vector3,
  Color,
  MathUtils,
} from 'three'
import { COLOR, ease, disposeTree, makeGlowTexture } from './palette.js'
import { ring, makeTextRing, makeScanner } from './holo/kit.js'

// The boot sequence. It plays once, inside the backdrop's own renderer (no
// extra WebGL context), far out from the orbit so fog hides the page's world:
//
//   uplink    fly through a tunnel of streaming code
//   assemble  a thousand fragments spiral in and build the core
//   breach    the core overloads: shockwave, flash, implosion
//   warp      jump down into the orbit the page lives in
//
// No post-processing. A bloom pass was tried and cost two seconds per frame on
// an integrated laptop GPU; the glow here comes from additive sprites instead.

export const INTRO = {
  start: { uplink: 0, assemble: 2.1, breach: 4.1, warp: 5.1 },
  total: 6.6,
}

const ORIGIN = new Vector3(0, 40, 900)
const CORE = new Vector3(0, 0, -72) // local to ORIGIN
const TUNNEL_LEN = 60

const SNIPPETS = [
  "const core = await uplink.connect('0-H')",
  'for (const node of sector[7]) node.breach()',
  'inject(payload, { offset: 0x3f00, mask: 0xff })',
  'if (firewall.integrity < 0.1) escalate()',
  'mov eax, [ebp+0x08]  ; load key',
  'xor ecx, ecx',
  'jmp 0x7c00',
  'fn decrypt(block: &[u8]) -> Result<Key>',
  'while (!core.open) shield.pulse()',
  'mount /dev/holo0 /mnt/orbit',
  'ssh operator@halldor.ch -p 2207',
  "SELECT * FROM nodes WHERE status = 'online';",
  'curl -X POST /api/breach -d \'{"cores":4}\'',
  'chmod 700 ./operator.key',
  'renderer.render(scene, camera)',
  '[ OK ] Started holographic layer',
  '[ OK ] Reached target orbit.target',
  '[FAIL] firewall.service: retrying',
  'handshake ok  latency 12ms',
  'git push origin main',
  'let signal = sample(osc, 44100)',
  'export default defineComponent({ name: "Core" })',
  'breach --sector 07 --cores 4 --force',
  'uint8_t key[32] = { 0 };',
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function hexRun() {
  let s = ''
  const n = 4 + Math.floor(Math.random() * 8)
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase() + ' '
  return s
}

// A square of code, drawn in columns so the lines run along the tunnel.
function codeTexture() {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 4

  function draw() {
    ctx.clearRect(0, 0, S, S)
    ctx.font = '500 19px "JetBrains Mono", ui-monospace, Consolas, monospace'
    ctx.textBaseline = 'middle'
    const cols = 38
    const w = S / cols
    for (let c = 0; c < cols; c++) {
      ctx.save()
      ctx.translate(c * w + w / 2, 0)
      ctx.rotate(Math.PI / 2)
      let y = -Math.random() * 300
      while (y < S) {
        const text = Math.random() < 0.3 ? hexRun() : pick(SNIPPETS)
        const red = Math.random() < 0.09
        ctx.fillStyle = red
          ? `rgba(224, 87, 79, ${0.75 + Math.random() * 0.25})`
          : `rgba(220, 216, 192, ${0.2 + Math.random() * 0.75})`
        ctx.fillText(text, y, 0)
        y += ctx.measureText(text).width + 24 + Math.random() * 90
      }
      ctx.restore()
    }
    texture.needsUpdate = true
  }
  draw()
  document.fonts?.load('500 19px "JetBrains Mono"').then(draw, () => {})
  return texture
}

// ---------- 1. the code tunnel ----------

function buildTunnel() {
  const group = new Group()
  const base = codeTexture()
  const layers = [
    { r: 2.1, around: 2, along: 5, speed: 1.1, opacity: 0.9 },
    { r: 3.3, around: 3, along: 4, speed: 0.6, opacity: 0.45 },
    { r: 5.2, around: 4, along: 3, speed: 0.32, opacity: 0.25 },
  ]
  const items = layers.map((l) => {
    const tex = base.clone()
    tex.needsUpdate = true
    tex.repeat.set(l.around, l.along)
    const mesh = new Mesh(
      new CylinderGeometry(l.r, l.r, 74, 56, 1, true).rotateX(Math.PI / 2),
      new MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: l.opacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: BackSide,
      }),
    )
    mesh.position.z = -33
    group.add(mesh)
    return { mesh, tex, speed: l.speed, opacity: l.opacity }
  })

  // Chamfered gates the flight passes through, twisting as they go.
  const gates = []
  const gateMat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false })
  for (let i = 0; i < 10; i++) {
    const s = 1.55
    const c = s * 0.38
    const pts = [-s + c, s, s - c, s, s, s - c, s, -s + c, s - c, -s, -s + c, -s, -s, -s + c, -s, s - c]
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pts.flatMap((v, k) => (k % 2 === 1 ? [v, 0] : [v])), 3))
    const loop = new LineLoop(g, gateMat.clone())
    loop.position.z = -5 - i * 5.8
    loop.rotation.z = i * 0.16
    group.add(loop)
    gates.push(loop)
  }

  return {
    group,
    update(dt, camZ) {
      for (const it of items) it.tex.offset.y -= dt * it.speed
      for (const g of gates) {
        const dz = camZ - g.position.z
        const near = 1 - MathUtils.clamp(Math.abs(dz) / 7, 0, 1)
        g.material.opacity = 0.18 + near * 0.82
        g.material.color.setHex(dz < 1.2 && dz > -0.6 ? COLOR.red : COLOR.bone)
        g.rotation.z += dt * (0.4 + near * 2)
      }
    },
    fade(k) {
      for (const it of items) it.mesh.material.opacity = it.opacity * k
    },
    dispose() {
      base.dispose()
    },
  }
}

// ---------- streaks that rush past the camera (tunnel and warp) ----------

function buildStreaks(count = 460) {
  const pos = new Float32Array(count * 6)
  const col = new Float32Array(count * 6)
  const data = []
  const bone = new Color(COLOR.bone)
  const red = new Color(COLOR.red)
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 0.5 + Math.pow(Math.random(), 0.6) * 5
    data.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -Math.random() * 80 })
    const c = Math.random() < 0.12 ? red : bone
    col.set([c.r, c.g, c.b, c.r * 0.1, c.g * 0.1, c.b * 0.1], i * 6)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(col, 3))
  const material = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const lines = new LineSegments(geometry, material)
  lines.frustumCulled = false

  return {
    lines,
    // Streaks live in camera space: follow the camera, move towards it.
    update(dt, camera, speed, opacity) {
      lines.position.copy(camera.position)
      lines.quaternion.copy(camera.quaternion)
      material.opacity = opacity
      const stretch = Math.max(0.2, speed * 0.045)
      const attr = geometry.attributes.position
      for (let i = 0; i < count; i++) {
        const d = data[i]
        d.z += speed * dt
        if (d.z > 1) d.z -= 80
        attr.array.set([d.x, d.y, d.z, d.x, d.y, d.z - stretch], i * 6)
      }
      attr.needsUpdate = true
    },
  }
}

// ---------- 2. the chamber and the core ----------

// Evenly spaced points along the edges of a geometry.
function edgePoints(geometry, count) {
  const edges = new EdgesGeometry(geometry)
  const p = edges.attributes.position.array
  const segs = []
  let total = 0
  for (let i = 0; i < p.length; i += 6) {
    const a = new Vector3(p[i], p[i + 1], p[i + 2])
    const b = new Vector3(p[i + 3], p[i + 4], p[i + 5])
    const len = a.distanceTo(b)
    segs.push({ a, b, len })
    total += len
  }
  edges.dispose()
  geometry.dispose()
  const out = []
  for (let i = 0; i < count; i++) {
    let d = (i / count) * total
    for (const s of segs) {
      if (d <= s.len) {
        out.push(s.a.clone().lerp(s.b, d / s.len))
        break
      }
      d -= s.len
    }
  }
  return out
}

function buildChamber() {
  const group = new Group()
  group.position.copy(CORE)

  const cage = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(8.5, 1)),
    new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.12, depthWrite: false }),
  )
  group.add(cage)

  // Polar floor under the core.
  const floor = new Group()
  floor.position.y = -3.1
  for (const r of [1.6, 2.8, 4, 5.4, 7]) floor.add(ring(r, { color: COLOR.bone, opacity: 0.22, dashed: r > 3, dash: 0.25, gap: 0.2 }))
  const spokes = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    spokes.push(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6, Math.cos(a) * 7, 0, Math.sin(a) * 7)
  }
  const spokeGeo = new BufferGeometry()
  spokeGeo.setAttribute('position', new Float32BufferAttribute(spokes, 3))
  floor.add(new LineSegments(spokeGeo, new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.1 })))
  group.add(floor)

  // Gyroscope rings, each on its own axis.
  const gyro = [3.1, 3.55, 4.0].map((r, i) => {
    const holder = new Group()
    holder.add(ring(r, { plane: 'xy', color: i === 1 ? COLOR.red : COLOR.bone, opacity: i === 1 ? 0.85 : 0.5, segments: 128 }))
    holder.rotation.set(i * 0.9, i * 0.5, 0)
    holder.scale.setScalar(0.001)
    group.add(holder)
    return holder
  })

  const textRing = makeTextRing(' HALLDOR // PERSONAL · UNIT 0-H · SECTOR 07 · BREACH PROTOCOL ·', { radius: 2.55, repeat: 2 })
  textRing.material.opacity = 0
  group.add(textRing)

  const scanner = makeScanner(3.3)
  scanner.set(0, 0)
  group.add(scanner.group)

  // The emblem itself, faded in once the fragments have landed.
  const heart = new Mesh(new BoxGeometry(0.95, 0.95, 0.95), new MeshBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0 }))
  heart.rotation.set(0.6, 0.8, 0)
  const octa = new LineSegments(
    new EdgesGeometry(new OctahedronGeometry(1.8)),
    new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0 }),
  )
  const emblem = new Group()
  emblem.add(heart, octa)
  group.add(emblem)

  // ---------- fragments ----------
  const targets = [
    ...edgePoints(new OctahedronGeometry(1.8), 620),
    ...edgePoints(new BoxGeometry(1.2, 1.2, 1.2), 380),
  ]
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2
    targets.push(new Vector3(Math.cos(a) * 2.3, 0, Math.sin(a) * 2.3))
  }
  const N = targets.length
  const fragMat = new MeshBasicMaterial({ color: 0xffffff })
  const frags = new InstancedMesh(new BoxGeometry(0.058, 0.058, 0.058), fragMat, N)
  frags.frustumCulled = false
  const bone = new Color(COLOR.bone)
  const red = new Color(COLOR.red)
  const starts = []
  const delays = []
  const spins = []
  const bursts = []
  for (let i = 0; i < N; i++) {
    const dir = new Vector3().randomDirection()
    starts.push(dir.clone().multiplyScalar(9 + Math.random() * 9))
    delays.push(Math.random() * 0.85)
    spins.push(new Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8))
    bursts.push(targets[i].clone().normalize().add(new Vector3().randomDirection().multiplyScalar(0.6)).normalize())
    frags.setColorAt(i, Math.random() < 0.12 ? red : bone)
  }
  frags.instanceColor.needsUpdate = true
  frags.visible = false
  group.add(frags)

  // Shockwaves for the breach. Oriented to the camera when they fire.
  const shocks = [0, 1].map(() => {
    const m = new Mesh(
      new RingGeometry(0.97, 1, 160),
      new MeshBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
    )
    m.visible = false
    group.add(m)
    return m
  })

  // The light at the end of the tunnel, which becomes the core's glow, and a
  // red flare for the breach. Unfogged, so the tunnel can see it from afar.
  const glowTex = makeGlowTexture()
  const glow = new Sprite(new SpriteMaterial({ map: glowTex, color: COLOR.bone, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, fog: false }))
  glow.scale.setScalar(3)
  const flare = new Sprite(new SpriteMaterial({ map: glowTex, color: COLOR.red, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: false }))
  flare.scale.setScalar(0.001)
  group.add(glow, flare)

  const dummy = new Object3D()
  const tmp = new Vector3()

  return {
    group,
    frags,
    // a: seconds since assembly began. b: seconds since the breach (or < 0).
    update(dt, a, b, camera) {
      cage.rotation.y += dt * 0.12
      cage.rotation.x += dt * 0.05
      floor.rotation.y -= dt * 0.2
      textRing.rotation.y -= dt * 0.9

      const grow = ease.outBack(MathUtils.clamp((a - 0.3) / 0.9, 0, 1))
      gyro.forEach((g, i) => {
        g.scale.setScalar(Math.max(0.001, grow))
        g.rotation.x += dt * (0.7 + i * 0.5)
        g.rotation.y += dt * (0.4 + i * 0.3) * (i % 2 ? -1 : 1)
      })
      textRing.material.opacity = 0.85 * MathUtils.clamp((a - 0.6) / 0.6, 0, 1) * (b > 0 ? Math.max(0, 1 - b * 2) : 1)

      // Scanner sweeps up and down while the core builds.
      if (b < 0 && a > 0) {
        const s = Math.sin(a * 4.2)
        scanner.set(s * 2.4, MathUtils.clamp(a * 2, 0, 1))
      } else {
        scanner.set(0, 0)
      }

      // Emblem fades in over the landed fragments, then pulses.
      const solid = MathUtils.clamp((a - 1.25) / 0.5, 0, 1)
      heart.material.opacity = 0.92 * solid
      octa.material.opacity = solid
      // An invisible cube still writes depth and would cut a dark hole in the glow.
      heart.visible = solid > 0.02
      octa.visible = solid > 0.02
      emblem.rotation.y += dt * (0.6 + solid * 0.8)
      heart.rotation.x += dt * 1.1
      heart.rotation.y += dt * 1.4
      let pulse = 1 + Math.sin(a * 9) * 0.03 * solid
      if (b >= 0) {
        // Overload: swell, then implode to nothing.
        pulse = b < 0.3 ? 1 + ease.outCubic(b / 0.3) * 0.5 : Math.max(0, 1.5 * (1 - ease.inCubic(Math.min(1, (b - 0.3) / 0.55))))
      }
      emblem.scale.setScalar(Math.max(0.001, pulse))
      emblem.visible = pulse > 0.002

      // Glow: grows from the tunnel's light into the core, spikes on the breach.
      // Kept small on purpose: a glow covering most of the screen stalled an
      // integrated GPU at one frame per second. The big flash is the HTML glitch.
      if (a < 0) {
        const p = 1 + a / 2.1
        glow.material.opacity = 0.35 + p * 0.55
        glow.scale.setScalar(3 + p * 2.5)
      } else if (b < 0) {
        glow.material.opacity = 0.7 + solid * 0.2 + Math.sin(a * 9) * 0.06
        glow.scale.setScalar(MathUtils.lerp(5.5, 3, Math.min(1, a / 0.8)) + solid * 0.6)
      } else {
        const spike = b < 0.3 ? ease.outCubic(b / 0.3) : Math.max(0, 1 - (b - 0.3) / 0.7)
        glow.material.opacity = Math.max(0, spike)
        glow.scale.setScalar(3 + spike * 4)
        flare.material.opacity = 0.85 * spike
        flare.scale.setScalar(1.5 + spike * 6)
      }

      // Fragments: spiral in, hold with a shiver, then burst outward.
      frags.visible = a >= 0
      if (frags.visible) {
        const burstK = b > 0.28 ? ease.outCubic(Math.min(1, (b - 0.28) / 1.6)) : 0
        for (let i = 0; i < N; i++) {
          const k = MathUtils.clamp((a - delays[i]) / 0.8, 0, 1)
          const e = ease.outCubic(k)
          const swirl = (1 - e) * 2.4
          tmp.copy(starts[i]).applyAxisAngle(Object3D.DEFAULT_UP, swirl).lerp(targets[i], e)
          if (e >= 1 && b < 0) tmp.addScalar((Math.random() - 0.5) * 0.012)
          if (burstK > 0) tmp.addScaledVector(bursts[i], burstK * 34)
          dummy.position.copy(tmp)
          dummy.rotation.set(spins[i].x * (1 - e) + burstK * 6, spins[i].y * (1 - e), spins[i].z * (1 - e))
          dummy.scale.setScalar(0.45 + e * 0.55 + burstK * 1.5)
          dummy.updateMatrix()
          frags.setMatrixAt(i, dummy.matrix)
        }
        frags.instanceMatrix.needsUpdate = true
      }

      // Two shockwaves off the breach.
      shocks.forEach((m, i) => {
        const t = b - 0.28 - i * 0.14
        m.visible = t > 0 && t < 1.1
        if (!m.visible) return
        const k = t / 1.1
        m.scale.setScalar(0.6 + ease.outCubic(k) * (i ? 22 : 34))
        m.material.opacity = (1 - k) * (i ? 0.6 : 0.95)
        m.lookAt(camera.position)
      })
    },
    corePosition(target) {
      return group.getWorldPosition(target)
    },
    // Everything that starts hidden, shown for one shader compile pass.
    hidden: [frags, ...shocks],
    dispose() {
      glowTex.dispose()
    },
  }
}

// ---------- the director ----------

export function createIntro({ scene, camera, renderer, space, emit, home }) {
  const root = new Group()
  root.position.copy(ORIGIN)
  scene.add(root)

  const tunnel = buildTunnel()
  const chamber = buildChamber()
  const streaks = buildStreaks()
  root.add(tunnel.group, chamber.group)
  scene.add(streaks.lines)

  space.visible = false

  // Compile every shader and upload every texture before the clock starts, so
  // the first second isn't a stutter. Until then the HUD stays on its preload
  // screen and the canvas stays black.
  let ready = false
  let gone = false
  async function prepare() {
    for (const o of chamber.hidden) o.visible = true
    try {
      await renderer.compileAsync(scene, camera)
    } catch {
      // Older drivers: fall back to compiling on first render.
    }
    for (const o of chamber.hidden) o.visible = false
    root.traverse((o) => o.material?.map && renderer.initTexture(o.material.map))
    if (!gone) ready = true
  }
  prepare()

  let t = 0
  let phase = null
  let lastPct = -1
  let flashed = false
  let finished = false
  const corePos = chamber.corePosition(new Vector3())
  const camLocal = new Vector3()
  const warpFrom = { pos: new Vector3(), look: new Vector3() }
  const look = new Vector3()
  let warpHome = null

  function setPhase(p) {
    if (p === phase) return
    phase = p
    emit({ type: 'phase', phase: p })
  }


  function finish() {
    if (finished) return
    finished = true
    emit({ type: 'progress', value: 1, seconds: INTRO.total })
    emit({ type: 'done' })
  }

  function update(dt) {
    if (finished || !ready) return
    t += dt
    const S = INTRO.start
    const pct = Math.min(100, Math.floor((t / INTRO.total) * 100))
    if (pct !== lastPct) {
      lastPct = pct
      emit({ type: 'progress', value: t / INTRO.total, seconds: t })
    }

    let fov = 58
    let roll = 0
    let streakSpeed = 0
    let streakOpacity = 0

    if (t < S.assemble) {
      // ---------- uplink ----------
      setPhase('uplink')
      const p = t / S.assemble
      const z = -TUNNEL_LEN * (0.4 * p + 0.6 * (1 - Math.pow(1 - p, 3)))
      camLocal.set(Math.sin(t * 3.1) * 0.12, Math.cos(t * 2.3) * 0.1, z)
      camera.position.copy(ORIGIN).add(camLocal)
      look.copy(camera.position).add(new Vector3(0, 0, -10))
      camera.lookAt(look)
      roll = Math.sin(p * Math.PI) * 0.55
      fov = 58 + Math.sin(p * Math.PI) * 18
      streakSpeed = 40 + Math.sin(p * Math.PI) * 50
      streakOpacity = 0.9
      tunnel.fade(1 - MathUtils.clamp((p - 0.85) / 0.15, 0, 1) * 0.6)
    } else if (t < S.warp) {
      // ---------- assemble + breach: orbit the core ----------
      const a = t - S.assemble
      const b = t - S.breach
      setPhase(b >= 0 ? 'breach' : 'assemble')
      const q = MathUtils.clamp(a / (S.warp - S.assemble), 0, 1)
      const angle = ease.inOutCubic(q) * 1.35
      const r = MathUtils.lerp(12, 5.8, ease.outCubic(q))
      const h = MathUtils.lerp(0, 1.9, ease.inOutCubic(q))
      camera.position.set(corePos.x + Math.sin(angle) * r, corePos.y + h, corePos.z + Math.cos(angle) * r)
      if (b > 0.28) {
        const amp = 0.35 * Math.exp(-(b - 0.28) * 4)
        camera.position.x += (Math.random() - 0.5) * amp
        camera.position.y += (Math.random() - 0.5) * amp
      }
      camera.lookAt(corePos)
      fov = 58 - ease.outCubic(q) * 8
      tunnel.group.visible = a < 0.8
      tunnel.fade(Math.max(0, 0.4 - a))
      streakOpacity = Math.max(0, 0.9 - a * 1.5)
      streakSpeed = 20
      if (b >= 0.28 && !flashed) {
        flashed = true
        emit({ type: 'flash' })
      }
    } else if (t < INTRO.total) {
      // ---------- warp into orbit ----------
      setPhase('warp')
      if (!warpHome) {
        warpHome = home()
        warpFrom.pos.copy(camera.position)
        warpFrom.look.copy(corePos)
        space.visible = true
      }
      const w = (t - S.warp) / (INTRO.total - S.warp)
      const e = ease.inOutCubic(w)
      camera.position.lerpVectors(warpFrom.pos, warpHome.pos, e)
      look.lerpVectors(warpFrom.look, warpHome.look, ease.outCubic(w))
      camera.lookAt(look)
      roll = Math.sin(w * Math.PI) * -0.4
      fov = MathUtils.lerp(58, warpHome.fov, e) + Math.sin(w * Math.PI) * 42
      streakSpeed = 60 + Math.sin(w * Math.PI) * 320
      streakOpacity = Math.sin(Math.min(1, w * 1.4) * Math.PI) * 0.95
      chamber.group.visible = w < 0.5
    } else {
      finish()
      return
    }

    camera.rotateZ(roll)
    camera.fov = fov
    camera.updateProjectionMatrix()

    tunnel.update(dt, camera.position.z - ORIGIN.z)
    chamber.update(dt, t - S.assemble, t < S.breach ? -1 : t - S.breach, camera)
    streaks.update(dt, camera, streakSpeed, streakOpacity)
  }

  function render() {
    if (ready) renderer.render(scene, camera)
    else renderer.clear()
  }

  return {
    update,
    render,
    skip: finish,
    get done() {
      return finished
    },
    dispose() {
      scene.remove(root)
      scene.remove(streaks.lines)
      disposeTree(root)
      disposeTree(streaks.lines)
      gone = true
      tunnel.dispose()
      chamber.dispose()
      space.visible = true
    },
  }
}
