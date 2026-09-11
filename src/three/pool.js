import { Group, InstancedMesh, Object3D, DynamicDrawUsage } from 'three'

const dummy = new Object3D()

// A fixed-size set of identical things drawn in one call per layer. A layer is
// a geometry + material pair; extra layers (glow, outline) follow the same
// transforms with their own scale. Free slots are parked at scale zero, so
// nothing is allocated while the game runs.
export class InstancedPool {
  constructor(capacity, layers) {
    this.capacity = capacity
    this.object = new Group()
    this.layers = layers.map(({ geometry, material, scale = 1 }) => {
      const mesh = new InstancedMesh(geometry, material, capacity)
      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      mesh.frustumCulled = false
      this.object.add(mesh)
      return { mesh, scale }
    })
    this.items = []
    this.free = []
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i)

    dummy.position.set(0, -999, 0)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (const { mesh } of this.layers) {
      for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, dummy.matrix)
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  spawn(fields) {
    const slot = this.free.pop()
    if (slot === undefined) return null
    const item = Object.assign({ slot, dead: false }, fields)
    this.items.push(item)
    return item
  }

  // place(item, dummy) must set position, rotation and scale every time.
  commit(place) {
    const { items } = this
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]
      if (it.dead) {
        dummy.position.set(0, -999, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        for (const { mesh } of this.layers) mesh.setMatrixAt(it.slot, dummy.matrix)
        this.free.push(it.slot)
        items[i] = items[items.length - 1]
        items.pop()
        continue
      }
      place(it, dummy)
      const base = dummy.scale.x
      for (const { mesh, scale } of this.layers) {
        dummy.scale.setScalar(base * scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(it.slot, dummy.matrix)
      }
    }
    for (const { mesh } of this.layers) mesh.instanceMatrix.needsUpdate = true
  }

  clear() {
    for (const it of this.items) it.dead = true
    this.commit(() => {})
  }
}
