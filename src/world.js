import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { heightAt, pathDistance, TOWN, LAKE, RUINS, WATER_Y } from './terrain.js'
import { mulberry32, smoothstep, TAU } from './utils.js'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _s = new THREE.Vector3()
const _p = new THREE.Vector3()
const _c = new THREE.Color()

class GeoBatch {
  constructor() { this.parts = [] }
  add(geo, color, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.clone()
    _e.set(rx, ry, rz)
    _q.setFromEuler(_e)
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz))
    g.applyMatrix4(_m)
    _c.set(color)
    const count = g.attributes.position.count
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = _c.r
      arr[i * 3 + 1] = _c.g
      arr[i * 3 + 2] = _c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    if (g.attributes.uv) g.deleteAttribute('uv')
    this.parts.push(g)
    return this
  }
  mesh(material) {
    if (!this.parts.length) return null
    const merged = mergeGeometries(this.parts, false)
    const mesh = new THREE.Mesh(merged, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }
}

function box(w, h, d) { return new THREE.BoxGeometry(w, h, d) }

function makeSignTexture(main, sub) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 140
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, 140)
  grad.addColorStop(0, '#1a2a3d')
  grad.addColorStop(1, '#0a1523')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 140)
  ctx.strokeStyle = 'rgba(160,220,255,0.55)'
  ctx.lineWidth = 3
  ctx.strokeRect(6, 6, 500, 128)
  ctx.strokeStyle = 'rgba(160,220,255,0.18)'
  ctx.lineWidth = 1
  ctx.strokeRect(14, 14, 484, 112)
  ctx.fillStyle = '#eaf8ff'
  ctx.font = '600 34px Segoe UI, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(main, 256, 58)
  ctx.fillStyle = 'rgba(150,215,255,0.75)'
  ctx.font = '18px Segoe UI, Arial, sans-serif'
  ctx.fillText(sub, 256, 100)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeBannerTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 128, 256)
  grad.addColorStop(0, '#8f1f28')
  grad.addColorStop(1, '#4b0f18')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(128, 0); ctx.lineTo(128, 228); ctx.lineTo(64, 256); ctx.lineTo(0, 228)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(255,210,130,0.85)'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,220,150,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(64, 34); ctx.lineTo(96, 74); ctx.lineTo(64, 150); ctx.lineTo(32, 74); ctx.closePath(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(64, 52); ctx.lineTo(64, 132); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(46, 92); ctx.lineTo(82, 92); ctx.stroke()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function addPlayerStyleHouse(batch, solid, glow, x, z, angle, rng) {
  const ry = angle
  const bodyH = 3.4 + rng() * 1.6
  const w = 5.2 + rng() * 2.2
  const d = 4.4 + rng() * 1.6
  const y = heightAt(x, z)

  batch.add(box(w, bodyH, d), '#c9b795', x, y + bodyH / 2, z, ry)
  batch.add(box(w * 0.94, 0.5, d * 0.94), '#8c7657', x, y + 0.25, z, ry)
  batch.add(box(w + 0.5, 0.3, d + 0.5), '#6a5843', x, y + bodyH - 0.15, z, ry)

  // Timber frame accents
  const fw = w * 0.5 + 0.05
  solid.add(box(0.22, bodyH * 0.9, 0.22), '#4a3826', x + Math.cos(ry) * (w / 2 - 0.2), y + bodyH / 2, z - Math.sin(ry) * (w / 2 - 0.2), ry)
  solid.add(box(0.22, bodyH * 0.9, 0.22), '#4a3826', x - Math.cos(ry) * (w / 2 - 0.2), y + bodyH / 2, z + Math.sin(ry) * (w / 2 - 0.2), ry)

  // Roof
  const roofH = 2.3 + rng() * 0.9
  const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.78, roofH, 4, 1)
  batch.add(roof, rng() > 0.5 ? '#3d5a74' : '#6e3630', x, y + bodyH + roofH / 2 - 0.05, z, ry + Math.PI / 4)

  // Door (faces town center)
  const doorX = x + Math.sin(ry) * (d / 2 + 0.02)
  const doorZ = z + Math.cos(ry) * (d / 2 + 0.02)
  solid.add(box(1.0, 1.9, 0.12), '#4a3320', doorX, y + 0.95, doorZ, ry)

  // Windows
  const winY = y + bodyH * 0.6
  for (const side of [-1, 1]) {
    const wx = x + Math.cos(ry) * (w * 0.27) * side + Math.sin(ry) * (d / 2 + 0.04)
    const wz = z - Math.sin(ry) * (w * 0.27) * side + Math.cos(ry) * (d / 2 + 0.04)
    glow.add(box(0.85, 0.9, 0.08), '#ffd49a', wx, winY, wz, ry)
    glow.add(box(0.95, 0.12, 0.1), '#3d2c1a', wx, winY + 0.55, wz, ry)
    glow.add(box(0.95, 0.12, 0.1), '#3d2c1a', wx, winY - 0.55, wz, ry)
  }
  // Side window
  const sx = x + Math.cos(ry) * (w / 2 + 0.04)
  const sz = z - Math.sin(ry) * (w / 2 + 0.04)
  glow.add(box(0.08, 0.85, 0.75), '#ffd49a', sx, winY, sz, ry)

  // Chimney
  const chx = x - Math.cos(ry) * (w * 0.28)
  const chz = z + Math.sin(ry) * (w * 0.28)
  batch.add(box(0.7, 2.0, 0.7), '#7c6a58', chx, y + bodyH + roofH * 0.7, chz, ry)
}

function createTown() {
  const group = new THREE.Group()
  group.name = 'town'
  const batch = new GeoBatch()
  const solid = new GeoBatch()
  const glow = new GeoBatch()

  const groundY = heightAt(0, 0)
  const rng = mulberry32(4242)

  // Plaza platform + inlaid rings
  batch.add(new THREE.CylinderGeometry(22, 22.6, 0.5, 48), '#8f8d7f', 0, groundY - 0.05, 0)
  batch.add(new THREE.RingGeometry(14.6, 15.4, 64), '#a9a692', 0, groundY + 0.23, 0, 0, -Math.PI / 2)
  batch.add(new THREE.RingGeometry(8.2, 8.9, 64), '#a9a692', 0, groundY + 0.23, 0, 0, -Math.PI / 2)
  batch.add(new THREE.RingGeometry(21.1, 21.8, 64), '#b4ac8b', 0, groundY + 0.23, 0, 0, -Math.PI / 2)

  // Radial plaza spokes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU
    batch.add(box(0.5, 0.06, 7.2), '#a9a692', Math.cos(a) * 11.6, groundY + 0.24, Math.sin(a) * 11.6, -a)
  }

  // Fountain
  const fx = 0, fz = 0
  batch.add(new THREE.CylinderGeometry(4.6, 5.0, 0.9, 16), '#9b9a8b', fx, groundY + 0.45, fz)
  batch.add(new THREE.CylinderGeometry(3.9, 4.0, 0.35, 16), '#6f8e96', fx, groundY + 0.92, fz)
  batch.add(new THREE.CylinderGeometry(1.15, 1.5, 3.6, 10), '#a7a495', fx, groundY + 2.4, fz)
  batch.add(new THREE.CylinderGeometry(2.2, 1.0, 0.55, 12), '#9b9a8b', fx, groundY + 4.3, fz)
  batch.add(new THREE.SphereGeometry(0.55, 8, 6), '#b9c6c4', fx, groundY + 4.9, fz)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 3.8, 0.1, 24),
    new THREE.MeshStandardMaterial({ color: '#67c8dd', emissive: '#1b6d82', emissiveIntensity: 0.7, transparent: true, opacity: 0.85, roughness: 0.2 })
  )
  water.position.set(fx, groundY + 1.12, fz)
  group.add(water)

  // Water jet glow
  const jet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.16, 2.1, 6),
    new THREE.MeshBasicMaterial({ color: '#b9f4ff', transparent: true, opacity: 0.55 })
  )
  jet.position.set(fx, groundY + 3.6, fz)
  group.add(jet)

  // Houses ring (leave the north for the gate)
  const houseAngles = [0.55, 1.15, 1.85, 2.55, 3.7, 4.45, 5.15, 5.75]
  for (let i = 0; i < houseAngles.length; i++) {
    const a = houseAngles[i]
    const r = 26.5 + rng() * 3.5
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    addPlayerStyleHouse(batch, solid, glow, x, z, -a + Math.PI / 2 + (rng() - 0.5) * 0.2, rng)
  }

  // Town gate (north)
  const gz = -29
  const gy = heightAt(0, gz)
  for (const sx of [-1, 1]) {
    batch.add(box(1.5, 7.2, 1.5), '#9a988a', sx * 4.2, gy + 3.6, gz)
    batch.add(box(2.2, 0.7, 2.2), '#b0ad9c', sx * 4.2, gy + 0.35, gz)
    glow.add(new THREE.SphereGeometry(0.34, 8, 6), '#ffd49a', sx * 4.2, gy + 7.9, gz)
  }
  batch.add(box(11.0, 1.3, 1.8), '#8c8a7e', 0, gy + 7.6, gz)
  batch.add(box(9.0, 0.5, 2.1), '#a9a692', 0, gy + 8.35, gz)
  solid.add(box(2.0, 1.0, 0.6), '#4d4231', 0, gy + 6.7, gz)

  // Arch sign
  const signTex = makeSignTexture('TOWN OF BEGINNINGS', 'AINCRAD · FLOOR 1 · 10,000 PLAYERS')
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.08), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }))
  sign.position.set(0, gy + 6.05, gz + 0.98)
  group.add(sign)
  const signBack = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.08), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }))
  signBack.position.set(0, gy + 6.05, gz - 0.98)
  signBack.rotation.y = Math.PI
  group.add(signBack)

  // Banners flanking the gate + plaza
  const bannerTex = makeBannerTexture()
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide, roughness: 0.9, emissive: '#2a0a0e', emissiveIntensity: 0.35 })
  for (const x of [-9.5, 9.5, -4.2, 4.2]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.7), bannerMat)
    const z = x === -4.2 || x === 4.2 ? -25.5 : -26.2
    b.position.set(x, heightAt(x, z) + 5.6, z)
    b.rotation.y = 0
    group.add(b)
  }

  // Lantern posts around plaza
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.22
    const x = Math.cos(a) * 18.6
    const z = Math.sin(a) * 18.6
    const y = heightAt(x, z)
    batch.add(new THREE.CylinderGeometry(0.09, 0.12, 3.5, 6), '#5c5140', x, y + 1.75, z)
    batch.add(new THREE.SphereGeometry(0.3, 8, 6), '#ffd49a', x, y + 3.65, z)
    glow.add(new THREE.SphereGeometry(0.34, 8, 6), '#ffe3b0', x, y + 3.65, z)
  }

  // Flower beds and benches
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3
    const x = Math.cos(a) * 20
    const z = Math.sin(a) * 20
    const y = heightAt(x, z)
    batch.add(new THREE.CylinderGeometry(1.1, 1.0, 0.5, 8), '#6b5a42', x, y + 0.25, z)
    for (let f = 0; f < 6; f++) {
      const fa = rng() * TAU, fr = rng() * 0.75
      glow.add(new THREE.SphereGeometry(0.12, 5, 4), rng() > 0.5 ? '#ff8a8a' : '#ffe18a', x + Math.cos(fa) * fr, y + 0.62, z + Math.sin(fa) * fr)
    }
  }

  const stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 })
  const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: '#ffb45e', emissiveIntensity: 1.3 })
  const stoneMesh = batch.mesh(stoneMat)
  const solidMesh = solid.mesh(stoneMat)
  const glowMesh = glow.mesh(glowMat)
  for (const m of [stoneMesh, solidMesh]) {
    if (m) { m.castShadow = true; m.receiveShadow = true; group.add(m) }
  }
  if (glowMesh) { glowMesh.castShadow = false; group.add(glowMesh) }

  // Colliders
  const colliders = [
    { x: 0, z: 0, r: 5.1 },
    { x: 0, z: gz, r: 2.2 }
  ]
  for (const a of houseAngles) {
    const r = 28
    colliders.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: 4.3 })
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.22
    colliders.push({ x: Math.cos(a) * 18.6, z: Math.sin(a) * 18.6, r: 0.4 })
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3
    colliders.push({ x: Math.cos(a) * 20, z: Math.sin(a) * 20, r: 1.2 })
  }

  return { group, colliders, fountain: { x: 0, z: 0 } }
}

function createRuins() {
  const group = new THREE.Group()
  const batch = new GeoBatch()
  const glow = new GeoBatch()
  const rng = mulberry32(777)
  const cx = RUINS.x, cz = RUINS.z
  const baseY = heightAt(cx, cz)

  // Broken platform
  batch.add(new THREE.CylinderGeometry(15, 16, 1.1, 10), '#767268', cx, baseY - 0.2, cz)
  batch.add(new THREE.RingGeometry(9.4, 10.2, 32), '#5c584e', cx, baseY + 0.36, cz, 0, -Math.PI / 2)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU
    const r = 11.8
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r
    batch.add(box(0.35, 0.1, 4.2), '#8d8778', x, baseY + 0.37, z, -a + Math.PI / 2)
  }

  // Standing and fallen pillars
  const pillars = [
    [-12, -4, 7, 0], [-9, 9, 5, 0.2], [7, 11, 8, -0.3], [12, -2, 4, 0.4],
    [3, -12, 6.5, 0.15], [-14, 5, 3, -0.2]
  ]
  for (const [dx, dz, h, tilt] of pillars) {
    const x = cx + dx, z = cz + dz
    const y = heightAt(x, z)
    batch.add(new THREE.CylinderGeometry(0.85, 1.0, h, 8), '#8a8478', x, y + h / 2, z, rng() * TAU, 0, tilt)
    batch.add(box(2.2, 0.45, 2.2), '#777267', x, y + 0.22, z, rng() * TAU)
    batch.add(box(2.4, 0.35, 2.4), '#8a8478', x + tilt * 0.4, y + h - 0.1, z, rng() * TAU)
  }
  // Fallen columns
  for (let i = 0; i < 4; i++) {
    const x = cx + (rng() - 0.5) * 22, z = cz + (rng() - 0.5) * 20
    const y = heightAt(x, z)
    batch.add(new THREE.CylinderGeometry(0.7, 0.7, 4 + rng() * 3, 7), '#7d786d', x, y + 0.7, z, rng() * TAU, Math.PI / 2, 0)
  }

  // Great broken arch
  const ax = cx, az = cz - 10
  const ay = heightAt(ax, az)
  for (const sx of [-1, 1]) {
    const px = ax + sx * 5
    batch.add(new THREE.CylinderGeometry(1.1, 1.35, 11, 8), '#7f7a6e', px, heightAt(px, az) + 5.5, az)
    glow.add(new THREE.BoxGeometry(0.4, 1.4, 0.2), '#67e2ff', px, heightAt(px, az) + 5.5, az + 1.2)
  }
  batch.add(box(13.5, 1.4, 2.2), '#6d685d', ax, ay + 11.4, az)
  batch.add(box(6.5, 1.2, 2.2), '#6d685d', ax + 2, ay + 12.5, az, 0.04)
  // Broken chunk gap: one side shorter
  glow.add(new THREE.TorusGeometry(7.6, 0.24, 6, 40), '#5ad8ff', ax, ay + 6.5, az, 0, Math.PI / 2)

  // Glowing rune circle
  glow.add(new THREE.RingGeometry(6.6, 6.9, 48), '#43d9ff', cx, baseY + 0.4, cz, 0, -Math.PI / 2)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU
    glow.add(box(0.18, 0.05, 1.5), '#7fe9ff', cx + Math.cos(a) * 8.1, baseY + 0.38, cz + Math.sin(a) * 8.1, -a)
  }

  const stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 })
  const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: '#1d8ea8', emissiveIntensity: 1.4 })
  const m = batch.mesh(stoneMat)
  if (m) { m.castShadow = true; m.receiveShadow = true; group.add(m) }
  const g = glow.mesh(glowMat)
  if (g) group.add(g)

  const colliders = []
  for (const [dx, dz] of pillars) colliders.push({ x: cx + dx, z: cz + dz, r: 1.3 })
  for (const sx of [-1, 1]) colliders.push({ x: ax + sx * 5, z: az, r: 1.5 })

  return { group, colliders, center: { x: cx, z: cz } }
}

function grassTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 64, 64)
  for (let i = 0; i < 9; i++) {
    const x = 6 + Math.random() * 52
    const w = 2 + Math.random() * 3
    const h = 26 + Math.random() * 36
    const lean = (Math.random() - 0.5) * 16
    const grad = ctx.createLinearGradient(x, 64, x + lean, 64 - h)
    grad.addColorStop(0, 'rgba(34,63,28,1)')
    grad.addColorStop(0.55, 'rgba(83,124,53,1)')
    grad.addColorStop(1, 'rgba(150,185,96,1)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x, 64)
    ctx.quadraticCurveTo(x + lean * 0.3, 64 - h * 0.6, x + lean, 64 - h)
    ctx.quadraticCurveTo(x + lean * 0.3 + w, 64 - h * 0.6, x + w, 64)
    ctx.closePath()
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createVegetation(scene) {
  const rng = mulberry32(2024)
  const treeSpots = []
  const treeCount = 200
  for (let i = 0; i < treeCount * 4 && treeSpots.length < treeCount; i++) {
    const a = rng() * TAU
    const r = 42 + rng() * 140
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const dTown = Math.hypot(x, z)
    const dLake = Math.hypot(x - LAKE.x, z - LAKE.z)
    const dRuin = Math.hypot(x - RUINS.x, z - RUINS.z)
    if (dTown < 42 || dLake < LAKE.r + 5 || dRuin < 24) continue
    if (pathDistance(x, z) < 4) continue
    // Prefer the eastern forest, thinning in the plains.
    const forestBias = x > 35 ? 0.95 : x < -20 ? 0.45 : 0.3
    if (rng() > forestBias) continue
    const y = heightAt(x, z)
    if (y < WATER_Y + 1.4) continue
    treeSpots.push({ x, z, y, s: 0.8 + rng() * 0.9, rot: rng() * TAU })
  }

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 4.2, 6)
  trunkGeo.translate(0, 2.1, 0)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4128', roughness: 1, flatShading: true })
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length)
  trunks.castShadow = true

  const foliageGeo = new THREE.IcosahedronGeometry(2.2, 0)
  const foliageMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, vertexColors: false })
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, treeSpots.length * 2)
  foliage.castShadow = true

  const colliders = []
  const mtx = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const col = new THREE.Color()
  treeSpots.forEach((t, i) => {
    mtx.compose(new THREE.Vector3(t.x, t.y, t.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot), new THREE.Vector3(t.s, t.s, t.s))
    trunks.setMatrixAt(i, mtx)
    const base = new THREE.Color('#3d6b31').lerp(new THREE.Color('#6f9440'), rng())
    for (let k = 0; k < 2; k++) {
      const s = t.s * (k === 0 ? 1.0 : 0.72)
      const yOff = t.s * (k === 0 ? 4.6 : 6.4)
      mtx.compose(
        new THREE.Vector3(t.x + (k ? 0.5 * t.s : 0), t.y + yOff, t.z + (k ? -0.3 * t.s : 0)),
        q.setFromAxisAngle(new THREE.Vector3(0.2, 1, 0.1).normalize(), t.rot + k),
        new THREE.Vector3(s, s * 1.15, s)
      )
      foliage.setMatrixAt(i * 2 + k, mtx)
      foliage.setColorAt(i * 2 + k, col.copy(base).multiplyScalar(k ? 1.08 : 0.95))
    }
    colliders.push({ x: t.x, z: t.z, r: 0.65 * t.s })
  })
  trunks.instanceMatrix.needsUpdate = true
  foliage.instanceMatrix.needsUpdate = true
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true
  scene.add(trunks, foliage)

  // Grass tufts
  const grassGeoA = new THREE.PlaneGeometry(0.7, 0.85)
  grassGeoA.translate(0, 0.42, 0)
  const grassGeoB = grassGeoA.clone()
  grassGeoB.rotateY(Math.PI / 2)
  const tuftGeo = mergeGeometries([grassGeoA, grassGeoB], false)
  const tex = grassTexture()
  const grassMat = new THREE.MeshStandardMaterial({
    map: tex, alphaTest: 0.42, transparent: false, side: THREE.DoubleSide,
    roughness: 1, color: '#a6c886'
  })
  grassMat.onBeforeCompile = shader => {
    shader.uniforms.uTime = { value: 0 }
    grassMat.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float wind = sin(uTime * 1.55 + instPos.x * 0.35 + instPos.z * 0.27) * 0.14
                   + sin(uTime * 2.7 + instPos.x * 0.9) * 0.05;
        transformed.x += wind * pow(max(position.y, 0.0), 1.5);
        transformed.z += wind * 0.5 * pow(max(position.y, 0.0), 1.5);
      `)
  }
  const grassCount = 3600
  const grass = new THREE.InstancedMesh(tuftGeo, grassMat, grassCount)
  grass.castShadow = false
  grass.receiveShadow = false
  const gq = new THREE.Quaternion()
  let gi = 0
  for (let i = 0; i < grassCount * 6 && gi < grassCount; i++) {
    const a = rng() * TAU
    const r = 12 + rng() * 155
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.hypot(x, z) < 7) continue
    if (pathDistance(x, z) < 1.6) continue
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r - 4) continue
    const y = heightAt(x, z)
    if (y < WATER_Y + 0.3) continue
    if (Math.hypot(x - RUINS.x, z - RUINS.z) < 14) continue
    const s = 0.55 + rng() * 0.8
    mtx.compose(new THREE.Vector3(x, y, z), gq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * TAU), new THREE.Vector3(s, s, s))
    grass.setMatrixAt(gi, mtx)
    gi++
  }
  grass.count = gi
  grass.instanceMatrix.needsUpdate = true
  grass.frustumCulled = false
  scene.add(grass)
  grass.userData.update = t => {
    const shader = grassMat.userData.shader
    if (shader) shader.uniforms.uTime.value = t
  }

  // Rocks
  const rockCount = 90
  const rockGeo = new THREE.DodecahedronGeometry(1, 0)
  const rockMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true })
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount)
  rocks.castShadow = true
  rocks.receiveShadow = true
  let ri = 0
  for (let i = 0; i < rockCount * 5 && ri < rockCount; i++) {
    const a = rng() * TAU
    const r = 20 + rng() * 156
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.hypot(x, z) < 25 || pathDistance(x, z) < 3) continue
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r) continue
    if (Math.hypot(x - RUINS.x, z - RUINS.z) < 22) continue
    const s = 0.6 + rng() * 2.6
    const y = heightAt(x, z)
    mtx.compose(
      new THREE.Vector3(x, y + s * 0.35, z),
      gq.setFromEuler(new THREE.Euler(rng() * 0.4, rng() * TAU, rng() * 0.4)),
      new THREE.Vector3(s, s * (0.6 + rng() * 0.5), s)
    )
    rocks.setMatrixAt(ri, mtx)
    rocks.setColorAt(ri, col.set('#8a8a80').multiplyScalar(0.8 + rng() * 0.35))
    colliders.push({ x, z, r: s * 0.8 })
    ri++
  }
  rocks.count = ri
  rocks.instanceMatrix.needsUpdate = true
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true
  scene.add(rocks)

  return { colliders, update: t => grass.userData.update(t) }
}

export function createWorld(scene) {
  const town = createTown()
  const ruins = createRuins()
  scene.add(town.group, ruins.group)

  const vegetation = createVegetation(scene)

  // Scattered distant pine silhouettes on the mountain ring for depth.
  const rng = mulberry32(999)
  const farTrees = new THREE.Group()
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#3c4a38', roughness: 1 })
  const leafMat = new THREE.MeshStandardMaterial({ color: '#2f4a33', roughness: 1, flatShading: true })
  for (let i = 0; i < 70; i++) {
    const a = rng() * TAU
    const r = 148 + rng() * 55
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const y = heightAt(x, z)
    if (y < 5) continue
    const s = 0.8 + rng() * 1.4
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 3.4, 5), trunkMat)
    trunk.position.set(x, y + 1.7 * s, z)
    trunk.scale.setScalar(s)
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.0, 6.5, 6), leafMat)
    leaves.position.set(x, y + 5.4 * s, z)
    leaves.scale.setScalar(s)
    farTrees.add(trunk, leaves)
  }
  scene.add(farTrees)

  return {
    town,
    ruins,
    colliders: [...town.colliders, ...ruins.colliders, ...vegetation.colliders],
    update: t => vegetation.update(t)
  }
}
