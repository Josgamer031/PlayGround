import * as THREE from 'three'
import { rand, TAU } from './utils.js'

function softTexture(inner = 'rgba(255,255,255,0.9)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, inner)
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export class Effects {
  constructor(scene, camera) {
    this.scene = scene
    this.camera = camera
    this.time = 0
    this.slashes = []
    this.bursts = []
    this.dusts = []
    this.waves = []
    this.soft = softTexture()

    const slashGeo = new THREE.RingGeometry(1.05, 1.85, 26, 1, -0.85, 1.7)
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#bff4ff', transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
      const mesh = new THREE.Mesh(slashGeo, mat)
      mesh.visible = false
      mesh.renderOrder = 5
      scene.add(mesh)
      this.slashes.push({ mesh, life: 0, max: 0.28, spin: 0 })
    }

    const burstGeo = new THREE.BufferGeometry()
    const maxP = 34
    burstGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxP * 3), 3))
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.PointsMaterial({
        color: '#fff3c4', size: 0.16, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, map: this.soft, alphaTest: 0.01
      })
      const pts = new THREE.Points(burstGeo.clone(), mat)
      pts.visible = false
      pts.frustumCulled = false
      pts.renderOrder = 6
      scene.add(pts)
      this.bursts.push({ pts, vels: [], life: 0, max: 0.5, count: maxP })
    }

    const dustGeo = new THREE.PlaneGeometry(1, 1)
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.soft, color: '#cbbfa8', transparent: true, opacity: 0, depthWrite: false })
      const sp = new THREE.Sprite(mat)
      sp.visible = false
      scene.add(sp)
      this.dusts.push({ sp, life: 0, max: 0.7, vel: new THREE.Vector3(), grow: 1 })
    }

    const waveGeo = new THREE.RingGeometry(0.9, 1.05, 48)
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#9be8ff', transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
      const mesh = new THREE.Mesh(waveGeo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      scene.add(mesh)
      this.waves.push({ mesh, life: 0, max: 0.5, maxR: 6 })
    }

    // Lock-on indicator
    this.lock = new THREE.Group()
    const lockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.7, 28),
      new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    lockRing.rotation.x = -Math.PI / 2
    this.lock.add(lockRing)
    const dia = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.95 })
    )
    dia.position.y = 0.7
    this.lock.add(dia)
    this.lock.visible = false
    scene.add(this.lock)
    this.lockTarget = null

    // Player aura ring (used on level-up / skills)
    this.aura = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.12, 48),
      new THREE.MeshBasicMaterial({ color: '#8fffd0', transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    this.aura.rotation.x = -Math.PI / 2
    this.aura.visible = false
    scene.add(this.aura)
    this.auraLife = 0
  }

  slash(pos, yaw, color = '#bff4ff', size = 1, tilt = 0, flip = false) {
    const s = this.slashes.find(x => x.life <= 0) || this.slashes[0]
    s.mesh.position.copy(pos)
    s.mesh.rotation.set(-Math.PI / 2 + tilt, yaw, flip ? Math.PI : 0)
    s.mesh.scale.setScalar(size)
    s.mesh.material.color.set(color)
    s.mesh.material.opacity = 0.95
    s.mesh.visible = true
    s.life = s.max = 0.26
    s.spin = (flip ? 1 : -1) * 7
  }

  burst(pos, color = '#ffe9ab', count = 22, speed = 7, size = 0.16) {
    const b = this.bursts.find(x => x.life <= 0) || this.bursts[0]
    const attr = b.pts.geometry.getAttribute('position')
    b.vels = []
    for (let i = 0; i < b.count; i++) {
      attr.setXYZ(i, pos.x, pos.y, pos.z)
      const v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(rand(speed * 0.3, speed))
      b.vels.push(v)
    }
    attr.needsUpdate = true
    b.pts.material.color.set(color)
    b.pts.material.size = size
    b.pts.material.opacity = 1
    b.pts.visible = true
    b.life = b.max = 0.55
  }

  dust(pos, count = 3, color = '#cbbfa8', spread = 0.7) {
    let spawned = 0
    for (const d of this.dusts) {
      if (d.life > 0) continue
      d.sp.position.set(pos.x + rand(-spread, spread), pos.y + rand(0.05, 0.25), pos.z + rand(-spread, spread))
      d.sp.material.color.set(color)
      d.sp.material.opacity = 0.55
      d.sp.scale.setScalar(rand(0.3, 0.7))
      d.vel.set(rand(-0.6, 0.6), rand(0.4, 1.1), rand(-0.6, 0.6))
      d.sp.visible = true
      d.life = d.max = rand(0.5, 0.9)
      d.grow = rand(1.2, 2.4)
      if (++spawned >= count) break
    }
  }

  wave(pos, color = '#9be8ff', maxR = 6, dur = 0.5) {
    const w = this.waves.find(x => x.life <= 0) || this.waves[0]
    w.mesh.position.set(pos.x, pos.y + 0.12, pos.z)
    w.mesh.material.color.set(color)
    w.mesh.material.opacity = 0.85
    w.mesh.scale.setScalar(0.4)
    w.mesh.visible = true
    w.life = w.max = dur
    w.maxR = maxR
  }

  auraPulse(pos, color = '#8fffd0', scale = 3.2) {
    this.aura.position.set(pos.x, pos.y + 0.1, pos.z)
    this.aura.material.color.set(color)
    this.aura.scale.setScalar(0.6)
    this.aura.userData.maxScale = scale
    this.aura.material.opacity = 0.85
    this.aura.visible = true
    this.auraLife = 0.7
  }

  setLock(target) {
    this.lockTarget = target
    this.lock.visible = !!target
  }

  update(dt) {
    this.time += dt
    for (const s of this.slashes) {
      if (!s.mesh.visible) continue
      s.life -= dt
      if (s.life <= 0) { s.mesh.visible = false; s.mesh.material.opacity = 0; continue }
      const p = 1 - s.life / s.max
      s.mesh.material.opacity = (1 - p) * 0.95
      s.mesh.rotation.z += s.spin * dt
      s.mesh.scale.multiplyScalar(1 + dt * 2.2)
    }
    for (const b of this.bursts) {
      if (!b.pts.visible) continue
      b.life -= dt
      if (b.life <= 0) { b.pts.visible = false; continue }
      const attr = b.pts.geometry.getAttribute('position')
      for (let i = 0; i < b.count; i++) {
        const v = b.vels[i]
        v.y -= 13 * dt
        v.multiplyScalar(1 - 1.6 * dt)
        attr.setXYZ(i, attr.getX(i) + v.x * dt, attr.getY(i) + v.y * dt, attr.getZ(i) + v.z * dt)
      }
      attr.needsUpdate = true
      b.pts.material.opacity = Math.min(1, b.life / b.max * 1.6)
    }
    for (const d of this.dusts) {
      if (!d.sp.visible) continue
      d.life -= dt
      if (d.life <= 0) { d.sp.visible = false; continue }
      d.sp.position.addScaledVector(d.vel, dt)
      d.sp.scale.multiplyScalar(1 + d.grow * dt)
      d.sp.material.opacity = (d.life / d.max) * 0.5
    }
    for (const w of this.waves) {
      if (!w.mesh.visible) continue
      w.life -= dt
      if (w.life <= 0) { w.mesh.visible = false; continue }
      const p = 1 - w.life / w.max
      w.mesh.scale.setScalar(0.4 + p * w.maxR)
      w.mesh.material.opacity = (1 - p) * 0.8
    }
    if (this.auraLife > 0) {
      this.auraLife -= dt
      const p = 1 - this.auraLife / 0.7
      this.aura.material.opacity = (1 - p) * 0.85
      this.aura.scale.setScalar(0.6 + p * (this.aura.userData.maxScale || 3))
      if (this.auraLife <= 0) this.aura.visible = false
    }
    if (this.lockTarget && this.lockTarget.alive) {
      this.lock.position.set(this.lockTarget.pos.x, this.lockTarget.pos.y + 0.05, this.lockTarget.pos.z)
      this.lock.rotation.y += dt * 1.6
      this.lock.children[1].position.y = 0.68 + Math.sin(this.time * 3) * 0.1
      this.lock.visible = true
    } else {
      this.lock.visible = false
    }
  }
}
