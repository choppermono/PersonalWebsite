import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  FogExp2,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  AdditiveBlending,
  Mesh,
  SphereGeometry,
  LineSegments,
  LineBasicMaterial,
  EdgesGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  IcosahedronGeometry,
  Vector3,
  MathUtils,
} from 'three'
import { COLOR, srgb, ease, createTweens, motionQuery, disposeTree } from './palette.js'
import { createHackGame } from './game.js'

// Where the camera rests in orbit, and where the dive ends just above the grid.
const ORBIT = { pos: new Vector3(0, 1.5, 22), look: new Vector3(0, -2.5, 0), fov: 50 }
const DIVE = { pos: new Vector3(0, -15, -15), look: new Vector3(0, -46, -30), fov: 96 }

const STAR_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aPhase;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.6 + 0.4 * sin(uTime * (0.5 + aPhase * 1.5) + aPhase * 6.2831);
    vAlpha = twinkle * (0.3 + 0.7 * clamp(aSize / 2.8, 0.0, 1.0));
    gl_PointSize = aSize * uPixelRatio;
  }
`

const STAR_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

// Dark body whose rim lights up where the surface turns away from the camera.
const PLANET_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const PLANET_FRAG = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uRim;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 4.0);
    gl_FragColor = vec4(mix(uBody, uRim, f * 0.55), 1.0);
  }
`

function buildStars({ count, rMin, rMax, sMin, sMax, color = COLOR.bone, surface = null }) {
  const pos = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const phase = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1
    const t = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const r = surface ?? rMin + Math.random() * (rMax - rMin)
    pos[i * 3] = r * s * Math.cos(t)
    pos[i * 3 + 1] = r * u
    pos[i * 3 + 2] = r * s * Math.sin(t)
    // Mostly faint, a few bright — the way a real sky reads.
    size[i] = sMin + Math.pow(Math.random(), 3) * (sMax - sMin)
    phase[i] = Math.random()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geometry.setAttribute('aSize', new Float32BufferAttribute(size, 1))
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phase, 1))
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: srgb(color) },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  return { points, material }
}

function buildPlanet() {
  const R = 56
  const group = new Group()
  group.position.set(0, -80, -30)

  const body = new Mesh(
    new SphereGeometry(R, 96, 64),
    new ShaderMaterial({
      uniforms: { uBody: { value: srgb(0x0d0c0a) }, uRim: { value: srgb(COLOR.bone) } },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    }),
  )
  group.add(body)

  // Graticule just above the surface. The body's depth hides the far side.
  const spin = new Group()
  const pts = []
  const r = R * 1.003
  const SEG = 128
  for (let lat = -75; lat <= 75; lat += 15) {
    const phi = MathUtils.degToRad(lat)
    const y = r * Math.sin(phi)
    const rr = r * Math.cos(phi)
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2
      const a1 = ((i + 1) / SEG) * Math.PI * 2
      pts.push(rr * Math.cos(a0), y, rr * Math.sin(a0), rr * Math.cos(a1), y, rr * Math.sin(a1))
    }
  }
  for (let lon = 0; lon < 180; lon += 12) {
    const th = MathUtils.degToRad(lon)
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2
      const a1 = ((i + 1) / SEG) * Math.PI * 2
      pts.push(
        r * Math.cos(a0) * Math.cos(th), r * Math.sin(a0), r * Math.cos(a0) * Math.sin(th),
        r * Math.cos(a1) * Math.cos(th), r * Math.sin(a1), r * Math.cos(a1) * Math.sin(th),
      )
    }
  }
  const gridGeo = new BufferGeometry()
  gridGeo.setAttribute('position', new Float32BufferAttribute(pts, 3))
  const gridMat = new LineBasicMaterial({
    color: COLOR.bone,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    fog: false,
  })
  spin.add(new LineSegments(gridGeo, gridMat))

  // Network nodes on the surface — the planet is the thing being hacked.
  const nodes = buildStars({ count: 90, surface: R * 1.006, sMin: 2.2, sMax: 4.2, color: COLOR.red })
  spin.add(nodes.points)

  group.add(spin)
  return { group, spin, gridMat, nodes }
}

function buildDebris() {
  const group = new Group()
  const bases = [new OctahedronGeometry(1), new TetrahedronGeometry(1), new IcosahedronGeometry(1, 0)]
  const edges = bases.map((g) => new EdgesGeometry(g))
  for (const g of bases) g.dispose()
  const mat = new LineBasicMaterial({ color: COLOR.bone, transparent: true, opacity: 0.42 })
  const items = []
  for (let i = 0; i < 22; i++) {
    const m = new LineSegments(edges[i % 3], mat)
    m.position.set((Math.random() * 2 - 1) * 34, -6 + Math.random() * 22, -8 - Math.random() * 48)
    m.scale.setScalar(0.3 + Math.random() * 1.1)
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0)
    m.userData.sx = (Math.random() - 0.5) * 0.5
    m.userData.sy = (Math.random() - 0.5) * 0.5
    m.userData.drift = (Math.random() - 0.5) * 0.35
    items.push(m)
    group.add(m)
  }
  return {
    group,
    update(dt) {
      for (const m of items) {
        m.rotation.x += m.userData.sx * dt
        m.rotation.y += m.userData.sy * dt
        m.position.x += m.userData.drift * dt
        if (m.position.x > 36) m.position.x = -36
        else if (m.position.x < -36) m.position.x = 36
      }
    },
  }
}

export function createBackdrop(canvas, { onGame, onFlash } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(COLOR.void, 1)

  const scene = new Scene()
  const spaceFog = new FogExp2(COLOR.void, 0.016)
  const arenaFog = new FogExp2(COLOR.void, 0.026)
  scene.fog = spaceFog

  const camera = new PerspectiveCamera(ORBIT.fov, 1, 0.1, 2000)
  const look = ORBIT.look.clone()
  camera.position.copy(ORBIT.pos)
  camera.lookAt(look)

  const mq = motionQuery()
  let reduced = mq.matches

  const space = new Group()
  scene.add(space)
  const stars = buildStars({ count: 2200, rMin: 260, rMax: 700, sMin: 0.8, sMax: 2.8 })
  const dust = buildStars({ count: 420, rMin: 26, rMax: 90, sMin: 0.6, sMax: 1.6 })
  const planet = buildPlanet()
  const debris = buildDebris()
  space.add(stars.points, dust.points, planet.group, debris.group)
  const starMats = [stars.material, dust.material, planet.nodes.material]

  const tweens = createTweens()
  let mode = 'space' // space | dive | arena | surface
  let game = null
  let looping = false
  let last = 0
  let elapsed = 0
  const pointer = { x: 0, y: 0 }

  function getGame() {
    game ??= createHackGame({ scene, camera, canvas, emit: (e) => onGame?.(e), isReduced: () => reduced })
    return game
  }

  function renderOnce() {
    renderer.render(scene, camera)
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(ratio)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    for (const m of starMats) m.uniforms.uPixelRatio.value = ratio
    game?.resize()
    if (!looping) renderOnce()
  }

  function updateSpace(dt) {
    if (!reduced) {
      elapsed += dt
      planet.spin.rotation.y += dt * 0.018
      debris.update(dt)
      for (const m of starMats) m.uniforms.uTime.value = elapsed
    }
    if (mode !== 'space') return
    const k = 1 - Math.pow(0.1, dt)
    const tx = ORBIT.pos.x + (reduced ? 0 : pointer.x * 1.8 + Math.sin(elapsed * 0.07) * 0.6)
    const ty = ORBIT.pos.y + (reduced ? 0 : -pointer.y * 0.9)
    camera.position.x += (tx - camera.position.x) * k
    camera.position.y += (ty - camera.position.y) * k
    camera.lookAt(look)
  }

  function tick(time) {
    const dt = last ? Math.min((time - last) / 1000, 0.1) : 1 / 60
    last = time
    tweens.update(dt)
    if (mode === 'arena') game.update(dt)
    else updateSpace(dt)
    renderer.render(scene, camera)
  }

  // Loop only while something moves: always in the arena, in orbit only with motion allowed.
  function ensureLoop() {
    const want = !document.hidden && (mode !== 'space' || !reduced)
    if (want && !looping) {
      last = 0
      renderer.setAnimationLoop(tick)
      looping = true
    } else if (!want && looping) {
      renderer.setAnimationLoop(null)
      looping = false
      renderOnce()
    }
  }

  function setPose(pose) {
    camera.position.copy(pose.pos)
    look.copy(pose.look)
    camera.fov = pose.fov
    camera.updateProjectionMatrix()
    camera.lookAt(look)
  }

  function toArena() {
    space.visible = false
    scene.fog = arenaFog
    planet.gridMat.opacity = 0.13
    mode = 'arena'
    getGame().start()
    ensureLoop()
  }

  function enterHack() {
    if (mode !== 'space') return
    getGame()
    if (reduced) {
      toArena()
      return
    }
    mode = 'dive'
    const fromPos = camera.position.clone()
    const fromLook = look.clone()
    const fromFov = camera.fov
    let flashed = false
    tweens.add(
      950,
      (t) => {
        const e = ease.inCubic(t)
        camera.position.lerpVectors(fromPos, DIVE.pos, e)
        look.lerpVectors(fromLook, DIVE.look, e)
        camera.fov = MathUtils.lerp(fromFov, DIVE.fov, e)
        camera.updateProjectionMatrix()
        camera.lookAt(look)
        planet.gridMat.opacity = MathUtils.lerp(0.13, 0.55, e)
        if (!flashed && t > 0.8) {
          flashed = true
          onFlash?.()
        }
      },
      toArena,
    )
    ensureLoop()
  }

  function exitHack() {
    if (mode === 'space' || mode === 'surface') return
    tweens.clear()
    game?.stop()
    scene.fog = spaceFog
    space.visible = true
    planet.gridMat.opacity = 0.13
    if (reduced) {
      setPose(ORBIT)
      mode = 'space'
      ensureLoop()
      renderOnce()
      return
    }
    onFlash?.()
    mode = 'surface'
    setPose(DIVE)
    tweens.add(
      1300,
      (t) => {
        const e = ease.outCubic(t)
        camera.position.lerpVectors(DIVE.pos, ORBIT.pos, e)
        look.lerpVectors(DIVE.look, ORBIT.look, e)
        camera.fov = MathUtils.lerp(DIVE.fov, ORBIT.fov, e)
        camera.updateProjectionMatrix()
        camera.lookAt(look)
      },
      () => {
        mode = 'space'
        ensureLoop()
      },
    )
  }

  function restartHack() {
    if (mode === 'arena') game.restart()
  }

  function onPointer(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1
  }
  function onMotion(e) {
    reduced = e.matches
    ensureLoop()
  }

  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('visibilitychange', ensureLoop)
  mq.addEventListener('change', onMotion)

  resize()
  ensureLoop()

  return {
    enterHack,
    exitHack,
    restartHack,
    dispose() {
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', ensureLoop)
      mq.removeEventListener('change', onMotion)
      game?.dispose()
      disposeTree(space)
      renderer.dispose()
    },
  }
}
