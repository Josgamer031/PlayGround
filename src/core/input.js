import { clamp } from './utils.js'

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyJ: 'attack', KeyF: 'attack', Space: 'jump',
  KeyK: 'skill', KeyL: 'lock',
  ShiftLeft: 'dodge', ShiftRight: 'dodge',
  KeyE: 'interact', KeyQ: 'potion',
  Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm'
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas
    this.move = { x: 0, y: 0 }
    this.look = { x: 0, y: 0 }
    this.keys = new Set()
    this.queued = new Map()
    this.held = new Set()
    this.enabled = true
    this.stickPointer = null
    this.lookPointer = null
    this.lastLook = { x: 0, y: 0 }
    this._padActive = false
    this._bindKeyboard()
    this._bindStick()
    this._bindLook()
    this._bindActions()
  }

  _bindKeyboard() {
    window.addEventListener('keydown', e => {
      const action = KEYMAP[e.code]
      if (!action) return
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      if (!this.keys.has(action)) this.press(action)
      this.keys.add(action)
      this.held.add(action)
    })
    window.addEventListener('keyup', e => {
      const action = KEYMAP[e.code]
      if (!action) return
      this.keys.delete(action)
      this.held.delete(action)
    })
    window.addEventListener('blur', () => { this.keys.clear(); this.held.clear(); this.move.x = this.move.y = 0 })
  }

  press(action) {
    this.queued.set(action, (this.queued.get(action) || 0) + 1)
  }

  consume(action) {
    const n = this.queued.get(action) || 0
    if (n > 0) { this.queued.set(action, 0); return true }
    return false
  }

  isHeld(action) { return this.held.has(action) || this.keys.has(action) }

  clearQueued() { this.queued.clear() }

  _bindStick() {
    const zone = document.getElementById('stick-zone')
    const base = document.getElementById('stick-base')
    const knob = document.getElementById('stick-knob')
    if (!zone || !base || !knob) return
    const radius = 40
    const update = (e) => {
      const rect = base.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const len = Math.hypot(dx, dy)
      if (len > radius) { dx = dx / len * radius; dy = dy / len * radius }
      const nx = dx / radius, ny = dy / radius
      this.move.x = Math.abs(nx) > 0.08 ? nx : 0
      this.move.y = Math.abs(ny) > 0.08 ? ny : 0
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
      zone.classList.add('active')
    }
    const reset = () => {
      this.stickPointer = null
      this.move.x = 0; this.move.y = 0
      knob.style.transform = 'translate(-50%,-50%)'
      zone.classList.remove('active')
    }
    zone.addEventListener('pointerdown', e => {
      e.preventDefault()
      this.stickPointer = e.pointerId
      try { zone.setPointerCapture(e.pointerId) } catch {}
      update(e)
    })
    zone.addEventListener('pointermove', e => {
      if (this.stickPointer !== e.pointerId) return
      e.preventDefault(); update(e)
    })
    zone.addEventListener('pointerup', e => { if (this.stickPointer === e.pointerId) reset() })
    zone.addEventListener('pointercancel', e => { if (this.stickPointer === e.pointerId) reset() })
    zone.addEventListener('lostpointercapture', () => { if (this.stickPointer !== null) reset() })
  }

  _bindLook() {
    const area = this.canvas
    if (!area) return
    const el = area.parentElement || area
    const onDown = e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (this.lookPointer !== null) return
      this.lookPointer = e.pointerId
      this.lastLook.x = e.clientX; this.lastLook.y = e.clientY
      try { el.setPointerCapture(e.pointerId) } catch {}
    }
    const onMove = e => {
      if (this.lookPointer !== e.pointerId) return
      const dx = e.clientX - this.lastLook.x
      const dy = e.clientY - this.lastLook.y
      this.lastLook.x = e.clientX; this.lastLook.y = e.clientY
      const limit = e.pointerType === 'mouse' ? 0.0034 : 0.0046
      this.look.x += dx * limit
      this.look.y += dy * limit
      // wheel-like visual feedback not needed
    }
    const onUp = e => { if (this.lookPointer === e.pointerId) this.lookPointer = null }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('lostpointercapture', onUp)
    el.addEventListener('contextmenu', e => e.preventDefault())
  }

  _bindActions() {
    for (const btn of document.querySelectorAll('[data-action]')) {
      const action = btn.dataset.action
      const down = e => {
        e.preventDefault(); e.stopPropagation()
        this.press(action)
        this.held.add(action)
        btn.classList.add('pressed')
      }
      const up = e => {
        e.stopPropagation()
        this.held.delete(action)
        btn.classList.remove('pressed')
      }
      btn.addEventListener('pointerdown', down)
      btn.addEventListener('pointerup', up)
      btn.addEventListener('pointercancel', up)
      btn.addEventListener('pointerleave', up)
    }
  }

  consumeLook() {
    const l = { ...this.look }
    this.look.x = 0; this.look.y = 0
    return l
  }

  update() {
    if (this.keys.has('up') || this.keys.has('down') || this.keys.has('left') || this.keys.has('right')) {
      if (this.stickPointer === null) {
        this.move.x = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0)
        this.move.y = (this.keys.has('down') ? 1 : 0) - (this.keys.has('up') ? 1 : 0)
      }
    }
    this.move.x = clamp(this.move.x, -1, 1)
    this.move.y = clamp(this.move.y, -1, 1)
  }
}
