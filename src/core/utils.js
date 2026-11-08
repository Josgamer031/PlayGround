import * as THREE from 'three'

/* ── math ─────────────────────────────────────────── */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt))
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a)
export const randInt = (a, b) => Math.floor(rand(a, b + 1))
export const TAU = Math.PI * 2

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
export function angleDiff(a, b) {
  let d = (b - a) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}
export const angleLerp = (a, b, t) => a + angleDiff(a, b) * t

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* deterministic 2D value noise, used by terrain prop scatter */
export function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return h - Math.floor(h)
}
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi), b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}
export function fbm(x, y, oct = 4) {
  let v = 0, amp = 0.5, f = 1
  for (let i = 0; i < oct; i++) { v += amp * noise2(x * f, y * f); f *= 2.03; amp *= 0.5 }
  return v
}

/* ── canvas textures ──────────────────────────────── */
const texCache = new Map()

export function radialGlow(color = '#9feaff', inner = 0.05, mid = 0.45) {
  const key = `glow:${color}:${inner}:${mid}`
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64)
  grad.addColorStop(0, color)
  grad.addColorStop(inner, color)
  grad.addColorStop(mid, color.replace(')', ',0.35)').replace('rgb', 'rgba'))
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t)
  return t
}

export function glowTexture() {
  const key = 'glowtex'
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(190,240,255,0.85)')
  grad.addColorStop(0.6, 'rgba(120,210,255,0.28)')
  grad.addColorStop(1, 'rgba(80,150,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t)
  return t
}

export function slashTexture() {
  const key = 'slash'
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')
  g.clearRect(0, 0, 256, 64)
  const grad = g.createLinearGradient(0, 0, 256, 0)
  grad.addColorStop(0, 'rgba(120,230,255,0)')
  grad.addColorStop(0.22, 'rgba(160,245,255,0.65)')
  grad.addColorStop(0.55, 'rgba(255,255,255,1)')
  grad.addColorStop(0.8, 'rgba(130,220,255,0.55)')
  grad.addColorStop(1, 'rgba(80,180,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 256, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t)
  return t
}

export function petalTexture() {
  const key = 'petal'
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas'); c.width = c.height = 32
  const g = c.getContext('2d')
  g.translate(16, 16); g.rotate(0.6)
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 13)
  grad.addColorStop(0, 'rgba(255,240,248,1)')
  grad.addColorStop(0.55, 'rgba(255,190,220,0.95)')
  grad.addColorStop(1, 'rgba(255,150,200,0)')
  g.fillStyle = grad
  g.beginPath(); g.ellipse(0, 0, 6, 12, 0, 0, TAU); g.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t)
  return t
}

/* A label sprite. Uses a canvas with crisp text. */
export function labelSprite(text, { color = '#dff8ff', bg = 'rgba(5,14,24,.72)', border = 'rgba(127,231,255,.4)', size = 42, scale = 1 } = {}) {
  const c = document.createElement('canvas')
  const padX = 18, padY = 10
  const g = c.getContext('2d')
  g.font = `700 ${size}px "Trebuchet MS", sans-serif`
  const w = Math.ceil(g.measureText(text).width) + padX * 2
  const h = size + padY * 2
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  roundRect(ctx, 1, 1, w - 2, h - 2, 12); ctx.fill()
  ctx.strokeStyle = border; ctx.lineWidth = 2
  roundRect(ctx, 1, 1, w - 2, h - 2, 12); ctx.stroke()
  ctx.fillStyle = color
  ctx.font = `700 ${size}px "Trebuchet MS", sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2 + 1)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: true })
  const s = new THREE.Sprite(mat)
  s.scale.set((w / h) * 0.55 * scale, 0.55 * scale, 1)
  return s
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/* damage number sprite texture cache */
const numberCache = new Map()
export function numberTexture(text, color = '#ffe27a', fontSize = 64) {
  const key = `${text}|${color}|${fontSize}`
  if (numberCache.has(key)) return numberCache.get(key)
  const c = document.createElement('canvas'); c.width = 256; c.height = 128
  const g = c.getContext('2d')
  g.font = `900 ${fontSize}px "Trebuchet MS", sans-serif`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 9; g.strokeStyle = 'rgba(0,10,20,.85)'
  g.strokeText(text, 128, 66)
  g.fillStyle = color
  g.fillText(text, 128, 66)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  numberCache.set(key, t)
  return t
}

/* random point helpers */
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function disposeObject(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (m.map && m.map.__owned) m.map.dispose()
        m.dispose()
      }
    }
  })
}
