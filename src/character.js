import * as THREE from 'three'
import { clamp, damp, lerp, smoothstep, TAU } from './utils.js'

const COL = {
  coat: '#141821',
  coatLight: '#202632',
  trim: '#2c3a4d',
  accent: '#3a4d5f',
  pants: '#171b22',
  boot: '#0a0c10',
  skin: '#e3bd97',
  hair: '#121419',
  hairLight: '#232833',
  belt: '#3a2e26',
  steel: '#333a45',
  blade: '#0c0e13',
  bladeEdge: '#5fe4ff',
  paleBlade: '#c2ccd9',
  paleEdge: '#9fe8ff'
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08, ...opts })
}

const materials = {
  coat: mat(COL.coat, { roughness: 0.82 }),
  coatLight: mat(COL.coatLight, { roughness: 0.78 }),
  trim: mat(COL.trim, { roughness: 0.6, metalness: 0.25 }),
  pants: mat(COL.pants, { roughness: 0.9 }),
  boot: mat(COL.boot, { roughness: 0.6, metalness: 0.15 }),
  skin: mat(COL.skin, { roughness: 0.75 }),
  hair: mat(COL.hair, { roughness: 0.65 }),
  belt: mat(COL.belt, { roughness: 0.8 }),
  steel: mat(COL.steel, { roughness: 0.35, metalness: 0.75 }),
  blade: mat(COL.blade, { roughness: 0.28, metalness: 0.9, emissive: '#06222c', emissiveIntensity: 0.8 }),
  edge: new THREE.MeshBasicMaterial({ color: COL.bladeEdge, toneMapped: false }),
  paleBlade: mat(COL.paleBlade, { roughness: 0.25, metalness: 0.85, emissive: '#123b4a', emissiveIntensity: 0.5 }),
  paleEdge: new THREE.MeshBasicMaterial({ color: COL.paleEdge, toneMapped: false }),
  eye: new THREE.MeshBasicMaterial({ color: '#6ff0b4', toneMapped: false })
}

function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = false
  return m
}

function box(w, h, d) { return new THREE.BoxGeometry(w, h, d) }

function makeSword(dark = true) {
  const g = new THREE.Group()
  const edgeMat = dark ? materials.edge : materials.paleEdge
  const bladeMat = dark ? materials.blade : materials.paleBlade

  const grip = part(new THREE.CylinderGeometry(0.026, 0.03, 0.23, 6), materials.belt, 0, 0, 0)
  g.add(grip)
  const guard = part(box(0.19, 0.035, 0.07), materials.steel, 0, 0.13, 0)
  g.add(guard)
  const blade = part(box(0.075, 0.92, 0.022), bladeMat, 0, 0.61, 0)
  g.add(blade)
  const shine = part(box(0.012, 0.9, 0.026), edgeMat, 0.033, 0.61, 0)
  g.add(shine)
  const tip = part(new THREE.ConeGeometry(0.044, 0.2, 4), bladeMat, 0, 1.16, 0)
  tip.rotation.y = Math.PI / 4
  g.add(tip)
  const pommel = part(new THREE.SphereGeometry(0.038, 6, 5), materials.steel, 0, -0.13, 0)
  g.add(pommel)
  return g
}

export class Character {
  constructor({ dual = false } = {}) {
    this.root = new THREE.Group()
    this.root.name = 'player'

    this.roll = new THREE.Group()
    this.roll.position.y = 0.95
    this.root.add(this.roll)
    this.body = new THREE.Group()
    this.body.position.y = -0.95
    this.roll.add(this.body)

    // ---- Legs
    this.hips = new THREE.Group()
    this.hips.position.y = 0.94
    this.body.add(this.hips)

    this.legL = new THREE.Group()
    this.legL.position.set(-0.145, 0, 0)
    this.hips.add(this.legL)
    this.legL.add(part(new THREE.CylinderGeometry(0.09, 0.075, 0.44, 6), materials.pants, 0, -0.22, 0))
    this.shinL = new THREE.Group()
    this.shinL.position.y = -0.44
    this.legL.add(this.shinL)
    this.shinL.add(part(new THREE.CylinderGeometry(0.073, 0.058, 0.4, 6), materials.boot, 0, -0.2, 0))
    this.shinL.add(part(box(0.15, 0.13, 0.27), materials.boot, 0, -0.4, 0.05))

    this.legR = new THREE.Group()
    this.legR.position.set(0.145, 0, 0)
    this.hips.add(this.legR)
    this.legR.add(part(new THREE.CylinderGeometry(0.09, 0.075, 0.44, 6), materials.pants, 0, -0.22, 0))
    this.shinR = new THREE.Group()
    this.shinR.position.y = -0.44
    this.legR.add(this.shinR)
    this.shinR.add(part(new THREE.CylinderGeometry(0.073, 0.058, 0.4, 6), materials.boot, 0, -0.2, 0))
    this.shinR.add(part(box(0.15, 0.13, 0.27), materials.boot, 0, -0.4, 0.05))

    // ---- Torso
    this.torso = new THREE.Group()
    this.torso.position.y = 0.02
    this.hips.add(this.torso)

    const chest = part(box(0.42, 0.55, 0.26), materials.coat, 0, 0.31, 0)
    this.torso.add(chest)
    this.torso.add(part(box(0.36, 0.2, 0.28), materials.coatLight, 0, 0.52, 0))
    this.torso.add(part(box(0.30, 0.15, 0.265), materials.trim, 0, 0.08, 0))
    this.torso.add(part(box(0.5, 0.07, 0.3), materials.belt, 0, 0.04, 0))
    this.torso.add(part(box(0.08, 0.41, 0.04), materials.trim, 0, 0.34, 0.135))
    // chest strap
    const strap = part(box(0.06, 0.6, 0.03), materials.steel, 0.12, 0.3, 0.14)
    strap.rotation.z = 0.5
    this.torso.add(strap)
    // collar
    this.torso.add(part(box(0.34, 0.1, 0.22), materials.trim, 0, 0.6, 0.01))

    // Coat tails
    this.coatL = new THREE.Group()
    this.coatL.position.set(-0.16, 0.06, -0.11)
    this.torso.add(this.coatL)
    this.coatL.add(part(box(0.22, 0.62, 0.05), materials.coatLight, 0, -0.31, 0))
    this.coatR = new THREE.Group()
    this.coatR.position.set(0.16, 0.06, -0.11)
    this.torso.add(this.coatR)
    this.coatR.add(part(box(0.22, 0.62, 0.05), materials.coatLight, 0, -0.31, 0))

    // ---- Head
    this.neck = new THREE.Group()
    this.neck.position.y = 0.63
    this.torso.add(this.neck)
    this.head = new THREE.Group()
    this.head.position.y = 0.17
    this.neck.add(this.head)
    const skull = part(new THREE.SphereGeometry(0.185, 12, 10), materials.skin, 0, 0, 0)
    skull.scale.set(0.94, 1.05, 0.92)
    this.head.add(skull)

    // Hair cap + spikes + bangs
    const hairCap = part(new THREE.SphereGeometry(0.2, 12, 8, 0, TAU, 0, Math.PI * 0.62), materials.hair, 0, 0.02, -0.012)
    hairCap.scale.set(1, 1.06, 1.02)
    this.head.add(hairCap)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU
      const spike = part(new THREE.ConeGeometry(0.055, 0.16, 4), materials.hair, Math.cos(a) * 0.13, 0.17, Math.sin(a) * 0.12 - 0.01)
      spike.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5)
      this.head.add(spike)
    }
    const bang = part(box(0.24, 0.1, 0.06), materials.hair, 0, 0.1, 0.16)
    bang.rotation.x = -0.12
    this.head.add(bang)
    this.head.add(part(box(0.055, 0.055, 0.02), materials.eye, -0.065, 0.01, 0.175))
    this.head.add(part(box(0.055, 0.055, 0.02), materials.eye, 0.065, 0.01, 0.175))

    // ---- Arms
    this.armL = new THREE.Group()
    this.armL.position.set(-0.25, 0.51, 0)
    this.torso.add(this.armL)
    this.armL.add(part(new THREE.CylinderGeometry(0.075, 0.065, 0.34, 6), materials.coat, 0, -0.17, 0))
    this.armL.add(part(new THREE.SphereGeometry(0.095, 8, 6), materials.coatLight, 0, 0.01, 0))
    this.foreL = new THREE.Group()
    this.foreL.position.y = -0.34
    this.armL.add(this.foreL)
    this.foreL.add(part(new THREE.CylinderGeometry(0.062, 0.055, 0.3, 6), materials.coat, 0, -0.15, 0))
    this.handL = new THREE.Group()
    this.handL.position.y = -0.31
    this.foreL.add(this.handL)
    this.handL.add(part(box(0.09, 0.1, 0.09), materials.skin, 0, -0.02, 0))

    this.armR = new THREE.Group()
    this.armR.position.set(0.25, 0.51, 0)
    this.torso.add(this.armR)
    this.armR.add(part(new THREE.CylinderGeometry(0.075, 0.065, 0.34, 6), materials.coat, 0, -0.17, 0))
    this.armR.add(part(new THREE.SphereGeometry(0.095, 8, 6), materials.coatLight, 0, 0.01, 0))
    this.foreR = new THREE.Group()
    this.foreR.position.y = -0.34
    this.armR.add(this.foreR)
    this.foreR.add(part(new THREE.CylinderGeometry(0.062, 0.055, 0.3, 6), materials.coat, 0, -0.15, 0))
    this.handR = new THREE.Group()
    this.handR.position.y = -0.31
    this.foreR.add(this.handR)
    this.handR.add(part(box(0.09, 0.1, 0.09), materials.skin, 0, -0.02, 0))

    // ---- Swords
    this.swordR = makeSword(true)
    this.swordR.position.set(0, -0.03, 0)
    this.swordR.rotation.set(Math.PI, 0, 0.16)
    this.handR.add(this.swordR)

    this.swordL = makeSword(false)
    this.swordL.position.set(0, -0.03, 0)
    this.swordL.rotation.set(Math.PI, 0, -0.16)
    this.handL.add(this.swordL)
    this.swordL.visible = false

    // Sheathed second sword on the back
    this.sheathed = makeSword(false)
    this.sheathed.scale.setScalar(0.95)
    this.sheathed.position.set(-0.02, 0.34, -0.17)
    this.sheathed.rotation.set(0, 0, -0.95)
    this.torso.add(this.sheathed)

    this.dual = dual
    this.applyDual(dual)

    // State
    this.time = 0
    this.phase = 0
    this.attack = null
    this.dodge = 0
    this.dodgeDur = 0.46
    this.hurt = 0
    this.sprint = 0
    this.speed = 0
    this.moving = 0
    this.skillGlow = 0
  }

  applyDual(dual) {
    this.dual = dual
    this.swordL.visible = dual
    this.sheathed.visible = !dual
  }

  playAttack(combo = 0, dualHand = false) {
    this.attack = { t: 0, dur: 0.44, combo, hand: dualHand ? 1 : 0 }
  }

  playSkill(index) {
    const dur = index === 0 ? 0.55 : index === 1 ? 0.65 : 0.95
    this.attack = { t: 0, dur, combo: index, hand: index === 2 ? 1 : 0, skill: true }
    this.skillGlow = 1
  }

  playDodge() {
    this.dodge = this.dodgeDur
  }

  playHurt() {
    this.hurt = 0.35
  }

  update(dt, state = {}) {
    this.time += dt
    const speed = state.speed || 0
    const moving = state.moving ? 1 : 0
    this.speed = damp(this.speed, speed, 8, dt)
    this.moving = damp(this.moving, moving, 9, dt)
    this.sprint = damp(this.sprint, state.sprint ? 1 : 0, 6, dt)

    const runAmt = clamp(this.speed / 4.4, 0, 1.45)
    this.phase += dt * (5.2 + this.speed * 1.35) * (this.moving > 0.05 ? 1 : 0)

    // Base pose
    let legLx = 0, legRx = 0, shinLx = 0, shinRx = 0
    let armLx = 0, armRx = 0, armLz = 0.06, armRz = -0.06
    let foreLx = 0.15, foreRx = 0.2
    let torsoX = -0.02, torsoY = 0, torsoZ = 0
    let headX = 0, headY = 0
    let bob = 0

    const swing = Math.sin(this.phase) * 0.62 * runAmt
    legLx = swing
    legRx = -swing
    shinLx = Math.max(0, -Math.sin(this.phase)) * 0.85 * runAmt
    shinRx = Math.max(0, Math.sin(this.phase)) * 0.85 * runAmt
    armLx = -swing * 0.85
    armRx = swing * 0.85
    torsoX = -0.05 - runAmt * 0.14 - this.sprint * 0.1
    bob = Math.abs(Math.sin(this.phase * 1)) * 0.045 * runAmt
    headX = 0.05 + runAmt * 0.06

    // Idle breathing
    const breathe = Math.sin(this.time * 1.55)
    torsoX += breathe * 0.012 * (1 - this.moving)
    armLz += breathe * 0.02 * (1 - this.moving)
    armRz -= breathe * 0.02 * (1 - this.moving)
    headY = Math.sin(this.time * 0.45) * 0.06 * (1 - this.moving)

    // Coat tails
    let coatL = 0.12 + runAmt * 0.34 + this.sprint * 0.2
    let coatR = 0.12 + runAmt * 0.34 + this.sprint * 0.2

    // Attack overrides
    if (this.attack) {
      this.attack.t += dt
      const a = this.attack
      const p = clamp(a.t / a.dur, 0, 1)
      const strike = smoothstep(0.22, 0.42, p) * (1 - smoothstep(0.5, 0.78, p))
      const wind = smoothstep(0.0, 0.24, p) * (1 - smoothstep(0.24, 0.36, p))
      const rec = smoothstep(0.7, 1, p)
      const side = a.hand === 0 ? 1 : -1

      if (a.skill) {
        if (a.combo === 0) {
          // Horizontal Arc: wide sweep
          torsoY += (-0.85 * wind + 0.95 * strike) * side
          armRx = -1.2 * wind - 1.55 * strike
          armRz = -0.9 * wind + 0.9 * strike
          foreRx = 0.35 + 0.5 * wind
          headY = -0.2 * wind + 0.3 * strike
          torsoX = -0.1 - 0.18 * strike
        } else if (a.combo === 1) {
          // Vorpal Strike: thrust
          torsoY += (-0.75 * wind + 0.35 * strike) * side
          torsoX += 0.12 * wind - 0.3 * strike
          armRx = -0.9 * wind - 1.62 * strike
          armRz = 0.15 * wind - 0.1 * strike
          foreRx = 0.8 - 0.7 * strike
          coatL += strike * 0.5; coatR += strike * 0.5
        } else {
          // Lightning Fall: overhead slam
          const lift = smoothstep(0.05, 0.36, p) * (1 - smoothstep(0.5, 0.62, p))
          const slam = smoothstep(0.52, 0.68, p) * (1 - smoothstep(0.82, 1, p))
          armLx = -2.7 * lift - 0.4 * slam
          armRx = -2.7 * lift - 0.4 * slam
          armLz = 0.4 * lift; armRz = -0.4 * lift
          foreLx = 0.3; foreRx = 0.3
          torsoX += -0.3 * lift + 0.32 * slam
          legLx = -0.3 * lift + 0.2 * slam
          legRx = 0.25 * lift - 0.25 * slam
        }
      } else {
        const combo = a.combo % 3
        if (combo === 0) {
          torsoY += (-0.65 * wind + 0.9 * strike) * side
          armRx = -1.35 * wind - 1.5 * strike
          armRz = -0.5 * wind + 0.75 * strike
          foreRx = 0.4 + 0.3 * wind
          headY += 0.2 * strike * side
        } else if (combo === 1) {
          torsoY += (0.7 * wind - 0.85 * strike) * side
          armRx = -1.1 * wind - 1.25 * strike
          armRz = 0.45 * wind - 0.65 * strike
          foreRx = 0.5
          torsoZ += 0.1 * wind
        } else {
          torsoX += 0.08 * wind - 0.26 * strike
          armRx = -2.5 * wind - 0.6 * strike
          armRz = -0.15
          foreRx = 0.15
          headX += -0.15 * wind + 0.2 * strike
        }
        if (side < 0) {
          // mirror mirrored-left swing values for dual wield
          const tmp = armRx
          armRx = armLx
          armLx = tmp * 0.9
          const tmpz = armRz
          armRz = -armLz
          armLz = -tmpz * 0.9
        }
      }

      // settle out of the recovery
      const settle = 1 - rec
      armRx *= settle
      armRz *= settle
      torsoX = lerp(torsoX, -0.04, rec)
      torsoY = lerp(torsoY, 0, rec)
      if (a.t >= a.dur) this.attack = null
    }

    // Dodge roll
    let rollAngle = 0
    let rollLift = 0
    if (this.dodge > 0) {
      this.dodge = Math.max(0, this.dodge - dt)
      const p = 1 - this.dodge / this.dodgeDur
      rollAngle = TAU * smoothstep(0, 1, p)
      rollLift = Math.sin(p * Math.PI) * 0.2
      torsoX = -0.55
      legLx = -0.9 * Math.sin(p * Math.PI)
      legRx = 0.6 * Math.sin(p * Math.PI)
      shinLx = 1.5 * Math.sin(p * Math.PI)
      shinRx = 1.2 * Math.sin(p * Math.PI)
      armLx = -1.2
      armRx = -1.2
      foreLx = 1.2
      foreRx = 1.2
      coatL = 1.2
      coatR = 1.2
    }

    // Hurt flinch
    if (this.hurt > 0) {
      this.hurt = Math.max(0, this.hurt - dt)
      const k = this.hurt / 0.35
      torsoX += 0.35 * k
      headX -= 0.3 * k
      armLz += 0.4 * k
      armRz -= 0.4 * k
    }

    // Apply with damping for smoothness
    const d = 28
    this.legL.rotation.x = damp(this.legL.rotation.x, legLx, d, dt)
    this.legR.rotation.x = damp(this.legR.rotation.x, legRx, d, dt)
    this.shinL.rotation.x = damp(this.shinL.rotation.x, shinLx, d, dt)
    this.shinR.rotation.x = damp(this.shinR.rotation.x, shinRx, d, dt)
    this.armL.rotation.x = damp(this.armL.rotation.x, armLx, d, dt)
    this.armR.rotation.x = damp(this.armR.rotation.x, armRx, d, dt)
    this.armL.rotation.z = damp(this.armL.rotation.z, armLz, d, dt)
    this.armR.rotation.z = damp(this.armR.rotation.z, armRz, d, dt)
    this.foreL.rotation.x = damp(this.foreL.rotation.x, foreLx, d, dt)
    this.foreR.rotation.x = damp(this.foreR.rotation.x, foreRx, d, dt)
    this.torso.rotation.x = damp(this.torso.rotation.x, torsoX, d, dt)
    this.torso.rotation.y = damp(this.torso.rotation.y, torsoY, d, dt)
    this.torso.rotation.z = damp(this.torso.rotation.z, torsoZ, d, dt)
    this.head.rotation.x = damp(this.head.rotation.x, headX, d, dt)
    this.head.rotation.y = damp(this.head.rotation.y, headY, d, dt)
    this.coatL.rotation.x = damp(this.coatL.rotation.x, -coatL, 10, dt)
    this.coatR.rotation.x = damp(this.coatR.rotation.x, -coatR, 10, dt)
    this.coatL.rotation.z = damp(this.coatL.rotation.z, 0.12 + runAmt * 0.1, 8, dt)
    this.coatR.rotation.z = damp(this.coatR.rotation.z, -0.12 - runAmt * 0.1, 8, dt)
    this.roll.rotation.x = damp(this.roll.rotation.x, rollAngle, 30, dt)
    this.roll.position.y = 0.95 - rollLift
    this.body.position.y = -0.95 + bob

    // Reset full flip after the roll completes to avoid wrapping issues
    if (rollAngle >= TAU - 0.05) this.roll.rotation.x = 0

    // Skill glow on blades
    if (this.skillGlow > 0) {
      this.skillGlow = Math.max(0, this.skillGlow - dt * 1.4)
      materials.edge.color.setHSL(0.52, 1, 0.55 + this.skillGlow * 0.25)
    }
  }

  get position() { return this.root.position }
  get yaw() { return this.root.rotation.y }
  set yaw(v) { this.root.rotation.y = v }
}
