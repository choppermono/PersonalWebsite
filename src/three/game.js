import {
  Group,
  Mesh,
  Line,
  LineSegments,
  LineLoop,
  Shape,
  ExtrudeGeometry,
  EdgesGeometry,
  IcosahedronGeometry,
  BoxGeometry,
  PlaneGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  LineDashedMaterial,
  AdditiveBlending,
  BackSide,
  HemisphereLight,
  DirectionalLight,
  Vector2,
  Vector3,
  Plane,
  Raycaster,
  MathUtils,
} from 'three'
import { COLOR, makeGlowTexture, ease, disposeTree } from './palette.js'
import { InstancedPool } from './pool.js'

// Three sectors, named after the ones in the full game at nier.halldor.ch.
// Core x/z are fractions of the arena, so portrait and landscape both work.
const WAVES = [
  {
    name: 'Access',
    cores: [{ x: 0, z: -0.26, hp: 10, shields: 4, scale: 1, fire: ['ring'], move: 'hover' }],
  },
  {
    name: 'Firewall',
    cores: [
      { x: -0.24, z: -0.2, hp: 8, shields: 3, scale: 0.9, fire: ['aimed'], move: 'drift' },
      { x: 0.24, z: -0.2, hp: 8, shields: 3, scale: 0.9, fire: ['ring'], move: 'drift' },
    ],
  },
  {
    name: 'Meltdown',
    cores: [{ x: 0, z: -0.24, hp: 26, shields: 8, scale: 1.45, fire: ['spiral', 'burst'], move: 'hover' }],
  },
]

const SHIP = { speed: 9.5, radius: 0.22, maxHp: 3, fireEvery: 0.09, shotSpeed: 26, invuln: 1.4 }
// Hitbox smaller than the drawn orb: grazing a bullet feels fair, not cheap.
const BULLET_R = 0.2
const ORB_R = 0.26
const MOVE_KEYS = {
  w: [0, -1],
  arrowup: [0, -1],
  s: [0, 1],
  arrowdown: [0, 1],
  a: [-1, 0],
  arrowleft: [-1, 0],
  d: [1, 0],
  arrowright: [1, 0],
}

function lineGeometry(points) {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(points, 3))
  return g
}

function circleXZ(radius, segments) {
  const pts = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius)
  }
  return lineGeometry(pts)
}

function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export function createHackGame({ scene, camera, canvas, emit, isReduced }) {
  const root = new Group()
  root.visible = false
  scene.add(root)

  const glowTex = makeGlowTexture()

  root.add(new HemisphereLight(0xfff8e6, 0x1a1813, 1.2))
  const sun = new DirectionalLight(0xffffff, 1.8)
  sun.position.set(6, 14, 9)
  root.add(sun)

  // ---------- shared geometry and materials (templates, disposed at the end) ----------

  const flatPlane = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const glowMat = (color, opacity) =>
    new MeshBasicMaterial({
      map: glowTex,
      color,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    })

  const boneSolid = new MeshStandardMaterial({
    color: COLOR.bone,
    flatShading: true,
    roughness: 0.5,
    metalness: 0.05,
  })
  const hullMat = new MeshStandardMaterial({
    color: COLOR.hull,
    flatShading: true,
    roughness: 0.55,
    metalness: 0.15,
    emissive: COLOR.bone,
    emissiveIntensity: 0,
  })
  const edgeMat = new LineBasicMaterial({ color: COLOR.bone })
  const inkEdgeMat = new LineBasicMaterial({ color: COLOR.ink })
  const threatMat = new LineDashedMaterial({
    color: COLOR.red,
    dashSize: 0.24,
    gapSize: 0.16,
    transparent: true,
    opacity: 0.6,
  })
  const coreFloorGlow = glowMat(COLOR.red, 0.22)

  const coreGeo = new IcosahedronGeometry(0.85, 0)
  const coreEdges = new EdgesGeometry(coreGeo)
  const shieldGeo = new BoxGeometry(0.36, 0.36, 0.36)
  const shieldEdges = new EdgesGeometry(shieldGeo)
  const threatGeo = circleXZ(1.95, 72)
  new LineLoop(threatGeo, threatMat).computeLineDistances()

  const templates = [
    boneSolid, hullMat, edgeMat, inkEdgeMat, threatMat, coreFloorGlow,
    coreGeo, coreEdges, shieldGeo, shieldEdges, threatGeo,
  ]

  // ---------- the ship: an arrowhead lying flat, nose toward -z ----------

  const shipShape = new Shape()
  shipShape.moveTo(0, 0.64)
  shipShape.lineTo(0.44, -0.44)
  shipShape.lineTo(0, -0.16)
  shipShape.lineTo(-0.44, -0.44)
  shipShape.closePath()
  const shipGeo = new ExtrudeGeometry(shipShape, { depth: 0.18, bevelEnabled: false })
  shipGeo.rotateX(-Math.PI / 2)

  const shipMat = boneSolid.clone()
  shipMat.emissive.setHex(COLOR.bone)
  shipMat.emissiveIntensity = 0.2

  const ship = new Group()
  const shipBody = new Group()
  shipBody.add(new Mesh(shipGeo, shipMat), new LineSegments(new EdgesGeometry(shipGeo), inkEdgeMat.clone()))
  const shipGlow = new Mesh(flatPlane, glowMat(COLOR.bone, 0.32))
  shipGlow.scale.setScalar(2.4)
  shipGlow.position.y = -0.3
  ship.add(shipBody, shipGlow)
  root.add(ship)

  const aimGeo = lineGeometry(new Float32Array(6))
  const aimLine = new Line(
    aimGeo,
    new LineDashedMaterial({ color: COLOR.bone, dashSize: 0.16, gapSize: 0.24, transparent: true, opacity: 0.32 }),
  )
  aimLine.frustumCulled = false
  root.add(aimLine)

  // ---------- pools ----------

  const shots = new InstancedPool(160, [
    { geometry: new BoxGeometry(0.09, 0.09, 0.64), material: new MeshBasicMaterial({ color: COLOR.bone }) },
    { geometry: flatPlane, material: glowMat(COLOR.bone, 0.4), scale: 0.75 },
  ])
  const orbGeo = new IcosahedronGeometry(ORB_R, 1)
  // Red orbs can be shot down. Dark ringed orbs cannot — the rule from the original.
  const hot = new InstancedPool(320, [
    { geometry: orbGeo, material: new MeshBasicMaterial({ color: COLOR.red }) },
    { geometry: flatPlane, material: glowMat(COLOR.red, 0.85), scale: 1.75 },
  ])
  const cold = new InstancedPool(320, [
    { geometry: orbGeo, material: new MeshBasicMaterial({ color: COLOR.ink }) },
    { geometry: orbGeo, material: new MeshBasicMaterial({ color: COLOR.bone, side: BackSide }), scale: 1.38 },
  ])
  const cubeGeo = new BoxGeometry(0.13, 0.13, 0.13)
  const sparksBone = new InstancedPool(380, [{ geometry: cubeGeo, material: new MeshBasicMaterial({ color: COLOR.bone }) }])
  const sparksRed = new InstancedPool(280, [{ geometry: cubeGeo, material: new MeshBasicMaterial({ color: COLOR.red }) }])
  root.add(shots.object, hot.object, cold.object, sparksBone.object, sparksRed.object)
  const pools = [shots, hot, cold, sparksBone, sparksRed]

  // ---------- state ----------

  const state = {
    phase: 'idle',
    phaseT: 0,
    wave: 0,
    elapsed: 0,
    damage: 0,
    timeScale: 1,
    slowT: 0,
    shake: 0,
    reported: false,
    clock: 0,
  }
  const player = {
    pos: new Vector3(),
    vel: new Vector3(),
    heading: 0,
    hp: SHIP.maxHp,
    invuln: 0,
    fireT: 0,
    alive: true,
  }
  const coresTotal = WAVES.reduce((n, w) => n + w.cores.length, 0)
  let coresDown = 0
  let cores = []
  let arena = null
  const camPose = { pos: new Vector3(), look: new Vector3(), high: new Vector3() }

  // ---------- arena, rebuilt per run to match the viewport's orientation ----------

  function buildArena() {
    if (arena) {
      root.remove(arena.group)
      disposeTree(arena.group)
    }
    const portrait = camera.aspect < 0.95
    const w = portrait ? 12 : 22
    const d = portrait ? 18 : 13
    const g = new Group()
    const fade = []

    const floorMat = new MeshBasicMaterial({ color: COLOR.floor, transparent: true, opacity: 0 })
    fade.push([floorMat, 1])
    const floor = new Mesh(new PlaneGeometry(w, d).rotateX(-Math.PI / 2), floorMat)
    floor.position.y = -0.01
    g.add(floor)

    const minor = []
    const major = []
    for (let i = 0; i <= w; i++) {
      const x = -w / 2 + i
      ;(i % 4 === 0 ? major : minor).push(x, 0, -d / 2, x, 0, d / 2)
    }
    for (let i = 0; i <= d; i++) {
      const z = -d / 2 + i
      ;(i % 4 === 0 ? major : minor).push(-w / 2, 0, z, w / 2, 0, z)
    }
    const minorMat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0 })
    const majorMat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0 })
    fade.push([minorMat, 0.08], [majorMat, 0.22])
    g.add(new LineSegments(lineGeometry(minor), minorMat), new LineSegments(lineGeometry(major), majorMat))

    // The hacking space runs on past the walls and fades into fog.
    const outer = []
    for (let i = -60; i <= 60; i += 2) outer.push(i, -0.03, -60, i, -0.03, 60, -60, -0.03, i, 60, -0.03, i)
    const outerMat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0 })
    fade.push([outerMat, 0.06])
    g.add(new LineSegments(lineGeometry(outer), outerMat))

    const wallMat = new MeshStandardMaterial({ color: COLOR.bone, flatShading: true, roughness: 0.55 })
    const wallEdge = new LineBasicMaterial({ color: COLOR.ink })
    const walls = new Group()
    const t = 0.22
    const h = 0.55
    const segments = [
      [0, -d / 2 - t / 2, w + t * 2, t, h],
      [0, d / 2 + t / 2, w + t * 2, t, h],
      [-w / 2 - t / 2, 0, t, d, h],
      [w / 2 + t / 2, 0, t, d, h],
    ]
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) segments.push([sx * (w / 2 + 0.3), sz * (d / 2 + 0.3), 0.62, 0.62, 1.5])
    for (const [x, z, sx, sz, sy] of segments) {
      const geo = new BoxGeometry(sx, sy, sz)
      const m = new Mesh(geo, wallMat)
      m.position.set(x, sy / 2, z)
      m.add(new LineSegments(new EdgesGeometry(geo), wallEdge))
      walls.add(m)
    }
    walls.scale.y = 0.001
    g.add(walls)

    const debrisMat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0 })
    fade.push([debrisMat, 0.3])
    const box = new BoxGeometry(1, 1, 1)
    const cubeEdge = new EdgesGeometry(box)
    box.dispose()
    const debris = []
    for (let i = 0; i < 26; i++) {
      const m = new LineSegments(cubeEdge, debrisMat)
      let x
      let z
      do {
        x = (Math.random() * 2 - 1) * (w / 2 + 14)
        z = (Math.random() * 2 - 1) * (d / 2 + 12)
      } while (Math.abs(x) < w / 2 + 2 && Math.abs(z) < d / 2 + 2)
      m.position.set(x, 0.5 + Math.random() * 4, z)
      m.scale.setScalar(0.4 + Math.random() * 1.4)
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0)
      m.userData.spin = (Math.random() - 0.5) * 0.6
      debris.push(m)
      g.add(m)
    }

    root.add(g)
    arena = { group: g, w, d, fade, walls, debris }
  }

  function fitCamera() {
    if (!arena) return
    camera.fov = 42
    const pitch = MathUtils.degToRad(57)
    const tv = Math.tan(MathUtils.degToRad(camera.fov / 2))
    const th = tv * camera.aspect
    // The HUD rows take a fixed number of pixels, so on a short screen they
    // eat a bigger share of the height. Fit the arena into what is left.
    const hudShare = Math.min(0.42, 170 / (canvas.clientHeight || window.innerHeight))
    const needV = (arena.d * 0.5 * Math.sin(pitch) + 0.9) / (tv * (1 - hudShare))
    const needH = (arena.w * 0.5 + 1.2) / th
    const dist = Math.max(needV, needH) * 1.04
    camPose.look.set(0, 0, 0.5)
    camPose.pos.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist + 0.5)
    // Near-vertical but not exactly: straight down would make lookAt's up vector degenerate.
    camPose.high.set(0, dist * 1.5, dist * 0.28)
    camera.updateProjectionMatrix()
  }

  // ---------- input ----------

  const keys = new Set()
  const ndc = new Vector2()
  const ray = new Raycaster()
  const floorPlane = new Plane(new Vector3(0, 1, 0), -0.3)
  const hit = new Vector3()
  let pointerActive = false
  let pointerType = 'mouse'
  let usingKeys = false
  let attached = false

  function readPointer(e) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    pointerType = e.pointerType || 'mouse'
  }
  function onPointerMove(e) {
    readPointer(e)
    if (pointerType === 'mouse' || e.buttons) {
      pointerActive = true
      usingKeys = false
    }
  }
  function onPointerDown(e) {
    readPointer(e)
    pointerActive = true
    usingKeys = false
  }
  function onPointerUp(e) {
    if ((e.pointerType || 'mouse') !== 'mouse') pointerActive = false
  }
  function onPointerLeave() {
    pointerActive = false
  }
  function onKeyDown(e) {
    const k = e.key.toLowerCase()
    if (k in MOVE_KEYS) {
      keys.add(k)
      usingKeys = true
      e.preventDefault()
    }
  }
  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase())
  }
  function onBlur() {
    keys.clear()
  }

  function attach() {
    if (attached) return
    attached = true
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
  }
  function detach() {
    if (!attached) return
    attached = false
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    keys.clear()
    pointerActive = false
  }

  // ---------- cores ----------

  function makeCore(spec) {
    const g = new Group()
    const spin = new Group()
    const bodyMat = hullMat.clone()
    const body = new Mesh(coreGeo, bodyMat)
    spin.add(body, new LineSegments(coreEdges, edgeMat))
    const threat = new LineLoop(threatGeo, threatMat)
    threat.position.y = -0.84
    const floorGlow = new Mesh(flatPlane, coreFloorGlow)
    floorGlow.position.y = -0.86
    floorGlow.scale.setScalar(4)
    g.add(spin, threat, floorGlow)

    const shields = []
    for (let i = 0; i < spec.shields; i++) {
      const mat = boneSolid.clone()
      mat.emissive.setHex(COLOR.red)
      mat.emissiveIntensity = 0
      const m = new Mesh(shieldGeo, mat)
      m.add(new LineSegments(shieldEdges, inkEdgeMat))
      g.add(m)
      shields.push({ mesh: m, mat, hp: 2, angle: (i / spec.shields) * Math.PI * 2 })
    }

    const home = new Vector3(spec.x * arena.w, 0.9, spec.z * arena.d)
    g.position.set(home.x, 7, home.z)
    g.scale.setScalar(0.001)
    root.add(g)

    return {
      spec,
      group: g,
      spin,
      bodyMat,
      threat,
      shields,
      home,
      pos: g.position,
      hp: spec.hp,
      scale: spec.scale,
      radius: 0.8 * spec.scale,
      alive: true,
      drop: 0,
      flash: 0,
      t: Math.random() * 10,
      phase: Math.random() * 6,
      fireT: { ring: 1.1, aimed: 0.8, spiral: 0.4, burst: 2.4 },
      ringN: 0,
      ringOffset: 0,
      spiralAngle: 0,
      spiralN: 0,
    }
  }

  function removeCore(c) {
    root.remove(c.group)
    c.bodyMat.dispose()
    for (const s of c.shields) s.mat.dispose()
    c.shields.length = 0
  }

  function clearCores() {
    for (const c of cores) if (c.group.parent) removeCore(c)
    cores = []
  }

  function fireBullet(kind, x, z, angle, speed) {
    ;(kind === 'hot' ? hot : cold).spawn({
      x: x + Math.cos(angle) * 0.9,
      z: z + Math.sin(angle) * 0.9,
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      age: 0,
    })
  }

  function coreFire(c, dt) {
    const f = c.fireT
    const x = c.pos.x
    const z = c.pos.z
    for (const kind of c.spec.fire) {
      f[kind] -= dt
      if (f[kind] > 0) continue
      if (kind === 'ring') {
        f.ring = 1.55
        c.ringN += 1
        const allHot = c.ringN % 2 === 0
        const n = 12
        for (let i = 0; i < n; i++) {
          fireBullet(allHot || i % 3 === 0 ? 'hot' : 'cold', x, z, c.ringOffset + (i / n) * Math.PI * 2, 4.2)
        }
        c.ringOffset += 0.26
      } else if (kind === 'aimed') {
        f.aimed = 1.1
        const a = Math.atan2(player.pos.z - z, player.pos.x - x)
        for (const s of [-0.24, 0, 0.24]) fireBullet('hot', x, z, a + s, 6.2)
      } else if (kind === 'spiral') {
        f.spiral = 0.08
        c.spiralN += 1
        const k = c.spiralN % 7 < 2 ? 'cold' : 'hot'
        fireBullet(k, x, z, c.spiralAngle, 4.6)
        fireBullet(k, x, z, c.spiralAngle + Math.PI, 4.6)
        c.spiralAngle += 0.29
      } else if (kind === 'burst') {
        f.burst = 2.7
        for (let i = 0; i < 18; i++) fireBullet('cold', x, z, (i / 18) * Math.PI * 2 + c.t, 3.3)
      }
    }
  }

  function updateCores(dt) {
    for (const c of cores) {
      if (!c.alive) continue
      c.t += dt
      if (c.drop < 1) {
        c.drop = Math.min(1, c.drop + dt / 0.8)
        c.group.scale.setScalar(c.scale * Math.max(0.001, ease.outBack(c.drop)))
        c.pos.y = MathUtils.lerp(7, 0.9, ease.outCubic(c.drop))
      } else {
        c.pos.y = 0.9 + Math.sin(c.t * 2) * 0.08
      }
      if (c.spec.move === 'drift') {
        c.pos.x = c.home.x + Math.sin(c.t * 0.55 + c.phase) * arena.w * 0.12
        c.pos.z = c.home.z + Math.sin(c.t * 0.8 + c.phase) * arena.d * 0.08
      } else {
        c.pos.x = c.home.x + Math.sin(c.t * 0.4) * 0.5
      }
      c.spin.rotation.x += dt * 0.6
      c.spin.rotation.y += dt * 0.9
      c.threat.rotation.y -= dt * 0.5
      for (const s of c.shields) {
        s.angle += dt * 1.5
        s.mesh.position.set(Math.cos(s.angle) * 1.6, Math.sin(s.angle * 2) * 0.15, Math.sin(s.angle) * 1.6)
        s.mesh.rotation.x += dt * 2
        s.mesh.rotation.y += dt * 1.3
        s.mat.emissiveIntensity = Math.max(0, s.mat.emissiveIntensity - dt * 4)
      }
      c.flash = Math.max(0, c.flash - dt * 5)
      c.bodyMat.emissiveIntensity = c.flash * 0.9
      if (state.phase === 'fight' && c.drop >= 1) coreFire(c, dt)
    }
  }

  function nearestCore() {
    let best = null
    let bd = Infinity
    for (const c of cores) {
      if (!c.alive || c.drop < 1) continue
      const d = (c.pos.x - player.pos.x) ** 2 + (c.pos.z - player.pos.z) ** 2
      if (d < bd) {
        bd = d
        best = c
      }
    }
    return best
  }

  // ---------- particles and feedback ----------

  function burst(pool, x, y, z, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = speed * (0.4 + Math.random() * 0.8)
      const life = 0.5 + Math.random() * 0.7
      pool.spawn({
        x,
        y,
        z,
        vx: Math.cos(a) * sp,
        vy: (0.3 + Math.random() * 0.9) * sp,
        vz: Math.sin(a) * sp,
        rx: Math.random() * 3,
        ry: Math.random() * 3,
        spin: (Math.random() - 0.5) * 14,
        life,
        size: 0.6 + Math.random() * 1.1,
      })
    }
  }

  function shake(amount) {
    state.shake = Math.max(state.shake, amount)
  }

  function emitState() {
    emit({
      type: 'state',
      hp: player.hp,
      maxHp: SHIP.maxHp,
      sector: WAVES[state.wave].name,
      index: state.wave + 1,
      sectors: WAVES.length,
      cores: coresDown,
      coresTotal,
    })
  }

  function hitShield(c, s) {
    s.hp -= 1
    s.mat.emissiveIntensity = 1
    const wx = c.pos.x + s.mesh.position.x * c.scale
    const wz = c.pos.z + s.mesh.position.z * c.scale
    burst(sparksBone, wx, c.pos.y, wz, 3, 3)
    if (s.hp <= 0) {
      c.group.remove(s.mesh)
      s.mat.dispose()
      c.shields.splice(c.shields.indexOf(s), 1)
      burst(sparksBone, wx, c.pos.y, wz, 12, 5)
      shake(0.1)
    }
  }

  function hitCore(c) {
    c.hp -= 1
    c.flash = 1
    burst(sparksRed, c.pos.x, c.pos.y, c.pos.z, 2, 3)
    if (c.hp <= 0) destroyCore(c)
  }

  function destroyCore(c) {
    c.alive = false
    burst(sparksBone, c.pos.x, c.pos.y, c.pos.z, 36 * c.scale, 8)
    burst(sparksRed, c.pos.x, c.pos.y, c.pos.z, 22 * c.scale, 6)
    for (const s of c.shields) {
      burst(sparksBone, c.pos.x + s.mesh.position.x * c.scale, c.pos.y, c.pos.z + s.mesh.position.z * c.scale, 6, 6)
    }
    removeCore(c)
    shake(0.55)
    if (!isReduced()) state.slowT = 0.35
    coresDown += 1
    emitState()
  }

  function hurtPlayer() {
    player.hp -= 1
    state.damage += 1
    player.invuln = SHIP.invuln
    shake(0.45)
    burst(sparksRed, player.pos.x, 0.35, player.pos.z, 14, 5)
    emit({ type: 'hit' })
    emitState()
    if (player.hp <= 0) {
      player.alive = false
      ship.visible = false
      aimLine.visible = false
      burst(sparksBone, player.pos.x, 0.35, player.pos.z, 40, 7)
      burst(sparksRed, player.pos.x, 0.35, player.pos.z, 20, 5)
      shake(0.8)
      setPhase('lost')
    }
  }

  function dissolveBullets() {
    let n = 0
    for (const b of hot.items) {
      if (!b.dead && n++ % 2 === 0) burst(sparksRed, b.x, 0.42, b.z, 1, 1.5)
      b.dead = true
    }
    for (const b of cold.items) {
      if (!b.dead && n++ % 2 === 0) burst(sparksBone, b.x, 0.42, b.z, 1, 1.5)
      b.dead = true
    }
  }

  // ---------- phases ----------

  function setPhase(p) {
    state.phase = p
    state.phaseT = 0
  }

  function enterBanner() {
    setPhase('banner')
    dissolveBullets()
    cores = WAVES[state.wave].cores.map(makeCore)
    emit({ type: 'banner', index: state.wave + 1, title: WAVES[state.wave].name })
    emitState()
  }

  function waveCleared() {
    dissolveBullets()
    if (state.wave >= WAVES.length - 1) setPhase('won')
    else setPhase('clear')
  }

  // ---------- per-frame ----------

  function updatePlayer(dt) {
    if (!player.alive) return
    const v = player.vel
    if (usingKeys && keys.size) {
      let x = 0
      let z = 0
      for (const k of keys) {
        x += MOVE_KEYS[k][0]
        z += MOVE_KEYS[k][1]
      }
      const len = Math.hypot(x, z) || 1
      v.set((x / len) * SHIP.speed, 0, (z / len) * SHIP.speed)
    } else if (pointerActive && !usingKeys) {
      ray.setFromCamera(ndc, camera)
      if (ray.ray.intersectPlane(floorPlane, hit)) {
        // On touch the ship sits above the finger instead of under it.
        if (pointerType !== 'mouse') hit.z -= 1.4
        const dx = hit.x - player.pos.x
        const dz = hit.z - player.pos.z
        const dist = Math.hypot(dx, dz)
        const sp = Math.min(SHIP.speed, dist * 7)
        if (dist > 0.04) v.set((dx / dist) * sp, 0, (dz / dist) * sp)
        else v.set(0, 0, 0)
      }
    } else {
      v.multiplyScalar(Math.pow(0.001, dt))
    }

    player.pos.addScaledVector(v, dt)
    const mx = arena.w / 2 - 0.45
    const mz = arena.d / 2 - 0.45
    player.pos.x = MathUtils.clamp(player.pos.x, -mx, mx)
    player.pos.z = MathUtils.clamp(player.pos.z, -mz, mz)

    const target = nearestCore()
    let ax = 0
    let az = 0
    if (target) {
      ax = target.pos.x - player.pos.x
      az = target.pos.z - player.pos.z
    } else if (v.lengthSq() > 0.5) {
      ax = v.x
      az = v.z
    }
    if (ax || az) player.heading = lerpAngle(player.heading, Math.atan2(-ax, -az), 1 - Math.pow(0.00005, dt))

    player.invuln = Math.max(0, player.invuln - dt)
    player.fireT -= dt
    if (state.phase === 'fight' && target && player.fireT <= 0) {
      player.fireT = SHIP.fireEvery
      const fx = -Math.sin(player.heading)
      const fz = -Math.cos(player.heading)
      for (const side of [-1, 1]) {
        shots.spawn({
          x: player.pos.x + fx * 0.55 - fz * 0.16 * side,
          z: player.pos.z + fz * 0.55 + fx * 0.16 * side,
          vx: fx * SHIP.shotSpeed,
          vz: fz * SHIP.shotSpeed,
          life: 1.4,
        })
      }
    }

    const lateral = v.x * Math.cos(player.heading) - v.z * Math.sin(player.heading)
    ship.position.set(player.pos.x, 0.32 + Math.sin(state.clock * 4) * 0.04, player.pos.z)
    ship.rotation.y = player.heading
    shipBody.rotation.z = MathUtils.clamp(-lateral * 0.045, -0.45, 0.45)
    ship.visible = player.invuln <= 0 || Math.floor(player.invuln * 14) % 2 === 0
  }

  function updateBullets(dt) {
    const bx = arena.w / 2
    const bz = arena.d / 2
    for (const pool of [hot, cold]) {
      for (const b of pool.items) {
        if (b.dead) continue
        b.x += b.vx * dt
        b.z += b.vz * dt
        b.age += dt
        if (Math.abs(b.x) > bx || Math.abs(b.z) > bz) b.dead = true
      }
    }
    for (const s of shots.items) {
      if (s.dead) continue
      s.x += s.vx * dt
      s.z += s.vz * dt
      s.life -= dt
      if (s.life <= 0 || Math.abs(s.x) > bx || Math.abs(s.z) > bz) s.dead = true
    }
  }

  function updateParticles(dt) {
    const drag = Math.pow(0.35, dt)
    for (const pool of [sparksBone, sparksRed]) {
      for (const p of pool.items) {
        if (p.dead) continue
        p.life -= dt
        if (p.life <= 0) {
          p.dead = true
          continue
        }
        p.vy -= 9 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        if (p.y < 0.07) {
          p.y = 0.07
          p.vy *= -0.35
          p.vx *= 0.7
          p.vz *= 0.7
        }
        p.vx *= drag
        p.vz *= drag
        p.rx += p.spin * dt
        p.ry += p.spin * 0.7 * dt
      }
    }
  }

  function collide() {
    const hotR2 = 0.12
    for (const s of shots.items) {
      if (s.dead) continue
      for (const b of hot.items) {
        if (b.dead) continue
        const dx = s.x - b.x
        const dz = s.z - b.z
        if (dx * dx + dz * dz < hotR2) {
          s.dead = true
          b.dead = true
          burst(sparksRed, b.x, 0.42, b.z, 4, 3)
          break
        }
      }
      if (s.dead) continue
      for (const c of cores) {
        if (!c.alive || c.drop < 1) continue
        let blocked = false
        for (const sh of c.shields) {
          const dx = s.x - (c.pos.x + sh.mesh.position.x * c.scale)
          const dz = s.z - (c.pos.z + sh.mesh.position.z * c.scale)
          const r = 0.3 * c.scale
          if (dx * dx + dz * dz < r * r) {
            blocked = true
            s.dead = true
            hitShield(c, sh)
            break
          }
        }
        if (blocked) break
        const dx = s.x - c.pos.x
        const dz = s.z - c.pos.z
        if (dx * dx + dz * dz < c.radius * c.radius) {
          s.dead = true
          hitCore(c)
          break
        }
      }
    }

    if (!player.alive || player.invuln > 0) return
    const rr = (SHIP.radius + BULLET_R) ** 2
    for (const pool of [hot, cold]) {
      for (const b of pool.items) {
        if (b.dead) continue
        const dx = b.x - player.pos.x
        const dz = b.z - player.pos.z
        if (dx * dx + dz * dz < rr) {
          b.dead = true
          hurtPlayer()
          return
        }
      }
    }
  }

  function updateAim() {
    const t = state.phase === 'fight' && player.alive ? nearestCore() : null
    aimLine.visible = !!t
    if (!t) return
    const arr = aimGeo.attributes.position.array
    arr[0] = player.pos.x
    arr[1] = 0.04
    arr[2] = player.pos.z
    arr[3] = t.pos.x
    arr[4] = 0.04
    arr[5] = t.pos.z
    aimGeo.attributes.position.needsUpdate = true
    aimLine.computeLineDistances()
  }

  function updateCamera(rawDt) {
    state.shake *= Math.pow(0.02, rawDt)
    const s = isReduced() ? 0 : state.shake
    const panX = player.pos.x * 0.07
    const panZ = player.pos.z * 0.05
    let px = camPose.pos.x
    let py = camPose.pos.y
    let pz = camPose.pos.z
    if (state.phase === 'build') {
      // Drop in from straight above, then swing to the play angle.
      const t = isReduced() ? 1 : ease.outCubic(Math.min(1, state.phaseT / 1.1))
      px = MathUtils.lerp(camPose.high.x, px, t)
      py = MathUtils.lerp(camPose.high.y, py, t)
      pz = MathUtils.lerp(camPose.high.z, pz, t)
    }
    camera.position.set(
      px + panX + (Math.random() - 0.5) * s,
      py + (Math.random() - 0.5) * s,
      pz + panZ + (Math.random() - 0.5) * s,
    )
    camera.lookAt(camPose.look.x + panX, camPose.look.y, camPose.look.z + panZ)
  }

  function commitPools() {
    shots.commit((s, o) => {
      o.position.set(s.x, 0.42, s.z)
      o.rotation.set(0, Math.atan2(s.vx, s.vz), 0)
      o.scale.setScalar(1)
    })
    const placeOrb = (b, o) => {
      o.position.set(b.x, 0.42, b.z)
      o.rotation.set(0, 0, 0)
      o.scale.setScalar(Math.min(1, 0.2 + b.age * 6))
    }
    hot.commit(placeOrb)
    cold.commit(placeOrb)
    const placeSpark = (p, o) => {
      o.position.set(p.x, p.y, p.z)
      o.rotation.set(p.rx, p.ry, 0)
      o.scale.setScalar(p.size * Math.min(1, p.life / 0.35))
    }
    sparksBone.commit(placeSpark)
    sparksRed.commit(placeSpark)
  }

  function update(rawDt) {
    if (state.phase === 'idle') return
    if (state.slowT > 0) state.slowT -= rawDt
    state.timeScale = state.slowT > 0 ? 0.3 : 1
    const dt = Math.min(rawDt, 1 / 30) * state.timeScale
    state.phaseT += dt
    state.clock += dt

    switch (state.phase) {
      case 'build': {
        const t = isReduced() ? 1 : Math.min(1, state.phaseT / 0.9)
        for (const [m, target] of arena.fade) m.opacity = target * ease.outCubic(t)
        arena.walls.scale.y = isReduced() ? 1 : Math.max(0.001, ease.outBack(Math.min(1, state.phaseT / 0.75)))
        const s = isReduced() ? 1 : Math.min(1, Math.max(0, (state.phaseT - 0.35) / 0.45))
        ship.scale.setScalar(Math.max(0.001, ease.outBack(s)))
        if (state.phaseT >= 1.1) enterBanner()
        break
      }
      case 'banner':
        if (state.phaseT >= 1.5) setPhase('fight')
        break
      case 'fight':
        state.elapsed += dt
        if (cores.length && cores.every((c) => !c.alive)) waveCleared()
        break
      case 'clear':
        if (state.phaseT >= 1.1) {
          state.wave += 1
          enterBanner()
        }
        break
      case 'won':
      case 'lost':
        if (state.phaseT >= 1.4 && !state.reported) {
          state.reported = true
          emit({
            type: 'end',
            result: state.phase === 'won' ? 'complete' : 'failed',
            time: state.elapsed,
            damage: state.damage,
            maxHp: SHIP.maxHp,
            sector: WAVES[state.wave].name,
          })
        }
        break
    }

    updatePlayer(dt)
    updateCores(dt)
    updateBullets(dt)
    updateParticles(dt)
    if (state.phase === 'fight') collide()
    for (const m of arena.debris) {
      m.rotation.x += m.userData.spin * dt
      m.rotation.y += m.userData.spin * 0.7 * dt
    }
    updateAim()
    updateCamera(rawDt)
    commitPools()
  }

  // ---------- public ----------

  function start() {
    attach()
    buildArena()
    fitCamera()
    clearCores()
    for (const p of pools) p.clear()
    Object.assign(state, {
      phase: 'build',
      phaseT: 0,
      wave: 0,
      elapsed: 0,
      damage: 0,
      timeScale: 1,
      slowT: 0,
      shake: 0,
      reported: false,
    })
    coresDown = 0
    player.pos.set(0, 0, arena.d * 0.3)
    player.vel.set(0, 0, 0)
    player.heading = 0
    player.hp = SHIP.maxHp
    player.invuln = 0
    player.fireT = 0.4
    player.alive = true
    ship.visible = true
    ship.scale.setScalar(0.001)
    aimLine.visible = false
    root.visible = true
    emitState()
  }

  function stop() {
    detach()
    setPhase('idle')
    clearCores()
    for (const p of pools) p.clear()
    root.visible = false
  }

  function dispose() {
    stop()
    if (arena) disposeTree(arena.group)
    disposeTree(root)
    scene.remove(root)
    for (const t of templates) t.dispose()
    glowTex.dispose()
  }

  return {
    start,
    stop,
    restart: start,
    update,
    resize: () => state.phase !== 'idle' && fitCamera(),
    dispose,
  }
}
