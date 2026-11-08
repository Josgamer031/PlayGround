import * as THREE from 'three'
import { clamp, lerp, smoothstep, mulberry32 } from './utils.js'

export const WORLD_SIZE = 430
export const WORLD_RADIUS = 205
export const WATER_Y = 0.7

export const TOWN = { x: 0, z: 0, r: 34 }
export const LAKE = { x: 104, z: 54, r: 34 }
export const RUINS = { x: -86, z: -46, r: 26 }

function baseHills(x, z) {
  return (
    Math.sin(x * 0.045) * Math.cos(z * 0.038) * 4.4 +
    Math.sin(x * 0.103 + 1.7) * Math.sin(z * 0.077 - 0.4) * 2.2 +
    Math.cos(x * 0.21 + z * 0.16) * 0.75 +
    Math.sin(x * 0.017 - z * 0.021) * 2.6
  )
}

export function heightAt(x, z) {
  const d = Math.hypot(x, z)
  let h = 3.0 + baseHills(x, z)

  // Flat plaza around the Town of Beginnings.
  const townT = smoothstep(TOWN.r + 4, TOWN.r + 34, d)
  h = lerp(3.05, h, townT)

  // Ragged mountain ring keeps the world feeling enclosed.
  const m = smoothstep(148, 208, d)
  h += m * m * 46 + m * 9

  // Mirror Lake basin.
  const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z)
  const lakeT = 1 - smoothstep(LAKE.r * 0.45, LAKE.r, lakeD)
  h -= 8.2 * lakeT

  // Raised ruin plateau.
  const ruinD = Math.hypot(x - RUINS.x, z - RUINS.z)
  const ruinT = 1 - smoothstep(RUINS.r * 0.55, RUINS.r + 8, ruinD)
  h = lerp(h, 7.2, ruinT * 0.85)

  return h
}

export function slopeAt(x, z) {
  const e = 0.9
  const hx = heightAt(x + e, z) - heightAt(x - e, z)
  const hz = heightAt(x, z + e) - heightAt(x, z - e)
  return Math.hypot(hx, hz) / (2 * e)
}

// Roads: town gate -> north plains, town -> forest, town -> ruin ridge.
const ROADS = [
  [[0, -8], [-4, -40], [2, -80], [10, -118]],
  [[8, 4], [38, 6], [58, -10], [78, -4]],
  [[-8, -4], [-32, -16], [-56, -26], [-75, -40]]
]

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1)
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

export function pathDistance(x, z) {
  let best = 999
  for (const road of ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSegment(x, z, road[i][0], road[i][1], road[i + 1][0], road[i + 1][1])
      if (d < best) best = d
    }
  }
  return best
}

export function isOnPath(x, z) {
  return pathDistance(x, z) < 2.4
}

const C_GRASS_A = new THREE.Color('#4d7c36')
const C_GRASS_B = new THREE.Color('#699645')
const C_GRASS_C = new THREE.Color('#3d6630')
const C_DIRT = new THREE.Color('#9c7d52')
const C_ROCK = new THREE.Color('#797c70')
const C_SAND = new THREE.Color('#b7a170')
const C_TOWN = new THREE.Color('#8d8a76')

export function createTerrain() {
  const seg = 176
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const rng = mulberry32(9137)
  const col = new THREE.Color()
  const grass = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = heightAt(x, z)
    pos.setY(i, y)

    const slope = slopeAt(x, z)
    const n = Math.sin(x * 0.42 + z * 0.31) * 0.5 + Math.sin(x * 0.17 - z * 0.23) * 0.5
    grass.copy(C_GRASS_A).lerp(C_GRASS_B, 0.5 + n * 0.35).lerp(C_GRASS_C, Math.max(0, -n) * 0.3)

    const townD = Math.hypot(x, z)
    const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z)
    const roadD = pathDistance(x, z)

    if (townD < TOWN.r + 2) grass.lerp(C_TOWN, 0.35)
    if (lakeD < LAKE.r + 3) {
      const shore = 1 - smoothstep(LAKE.r - 9, LAKE.r + 2, lakeD)
      grass.lerp(C_SAND, shore * 0.85)
    }
    if (roadD < 2.6) grass.lerp(C_DIRT, (1 - roadD / 2.6) * 0.8)
    if (slope > 0.42) grass.lerp(C_ROCK, smoothstep(0.42, 0.95, slope) * 0.85)

    col.copy(grass).multiplyScalar(0.93 + rng() * 0.14)
    colors[i * 3] = col.r
    colors[i * 3 + 1] = col.g
    colors[i * 3 + 2] = col.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  mesh.name = 'terrain'
  return mesh
}

export function createWater() {
  const geo = new THREE.PlaneGeometry(96, 96, 40, 40)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const base = Float32Array.from(pos.array)
  const mat = new THREE.MeshStandardMaterial({
    color: '#2f7691',
    roughness: 0.16,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(LAKE.x, WATER_Y, LAKE.z)
  mesh.receiveShadow = true
  mesh.userData.update = t => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]
      pos.setY(i, Math.sin(x * 0.45 + t * 1.1) * 0.16 + Math.cos(z * 0.38 - t * 0.85) * 0.14)
    }
    pos.needsUpdate = true
  }
  return mesh
}

export function zoneAt(x, z) {
  const townD = Math.hypot(x, z)
  if (townD < TOWN.r + 6) return { name: 'TOWN OF BEGINNINGS', sub: 'AINCRAD · FLOOR 1' }
  const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z)
  if (lakeD < LAKE.r + 12) return { name: 'MIRROR LAKE', sub: 'AINCRAD · FLOOR 1' }
  const ruinD = Math.hypot(x - RUINS.x, z - RUINS.z)
  if (ruinD < RUINS.r + 24) return { name: 'KOBOLD RUINS', sub: 'AINCRAD · FLOOR 1' }
  if (x > 40) return { name: 'WOLFPINE FOREST', sub: 'AINCRAD · FLOOR 1' }
  if (z < -25) return { name: 'BEGINNING PLAINS', sub: 'AINCRAD · FLOOR 1' }
  if (townD > 150) return { name: 'AINCRAD HIGHLANDS', sub: 'AINCRAD · FLOOR 1' }
  return { name: 'BEGINNING PLAINS', sub: 'AINCRAD · FLOOR 1' }
}
