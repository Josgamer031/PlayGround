/* Procedural audio — no external assets, tiny footprint. */
export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
    this.started = false
    this._wind = null
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.55
    master.connect(ctx.destination)
    this.master = master
    this._startAmbient()
  }

  setMuted(m) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.55, this.ctx.currentTime + 0.2)
    }
  }

  _now() { return this.ctx ? this.ctx.currentTime : 0 }

  _noiseBuffer(dur = 0.3) {
    const ctx = this.ctx
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  _noise(dur, { type = 'bandpass', f0 = 1000, f1 = null, q = 1.2, gain = 0.25, attack = 0.005 } = {}) {
    if (!this.ctx) return
    const ctx = this.ctx, t = ctx.currentTime
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer(dur)
    const filt = ctx.createBiquadFilter(); filt.type = type; filt.Q.value = q
    filt.frequency.setValueAtTime(f0, t)
    if (f1) filt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filt).connect(g).connect(this.master)
    src.start(t); src.stop(t + dur + 0.02)
  }

  _tone(freq, dur, { type = 'sine', gain = 0.2, f1 = null, delay = 0, attack = 0.006, dest = null } = {}) {
    if (!this.ctx) return
    const ctx = this.ctx, t = ctx.currentTime + delay
    const o = ctx.createOscillator(); o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(dest || this.master)
    o.start(t); o.stop(t + dur + 0.03)
  }

  _startAmbient() {
    const ctx = this.ctx
    const bus = ctx.createGain()
    bus.gain.value = 0
    bus.connect(this.master)
    bus.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 4)
    this.ambientBus = bus

    // warm A-major pad
    const chord = [110, 164.81, 220, 329.63]
    for (const f of chord) {
      const o = ctx.createOscillator()
      o.type = f > 200 ? 'sine' : 'triangle'
      o.frequency.value = f
      o.detune.value = (Math.random() - 0.5) * 8
      const g = ctx.createGain(); g.gain.value = 0.018
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.08
      const lg = ctx.createGain(); lg.gain.value = 0.012
      lfo.connect(lg).connect(g.gain)
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900
      o.connect(filt).connect(g).connect(bus)
      o.start(); lfo.start()
    }
    // wind
    const wind = ctx.createBufferSource()
    wind.buffer = this._noiseBuffer(4)
    wind.loop = true
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420; wf.Q.value = 0.6
    const wg = ctx.createGain(); wg.gain.value = 0.05
    const wlfo = ctx.createOscillator(); wlfo.frequency.value = 0.09
    const wlg = ctx.createGain(); wlg.gain.value = 0.025
    wlfo.connect(wlg).connect(wg.gain)
    wind.connect(wf).connect(wg).connect(bus)
    wind.start(); wlfo.start()
    this._wind = wind
  }

  slash() {
    this._noise(0.18, { type: 'bandpass', f0: 2600, f1: 340, q: 1.6, gain: 0.22 })
    this._tone(420, 0.1, { type: 'sawtooth', gain: 0.03, f1: 160 })
  }
  heavy() {
    this._noise(0.3, { type: 'lowpass', f0: 900, f1: 120, q: 0.8, gain: 0.34 })
    this._tone(90, 0.28, { type: 'sine', gain: 0.22, f1: 40 })
  }
  hit() {
    this._noise(0.12, { type: 'lowpass', f0: 1400, f1: 200, gain: 0.28 })
    this._tone(150, 0.12, { type: 'triangle', gain: 0.16, f1: 60 })
  }
  crit() {
    this._tone(1180, 0.14, { type: 'sine', gain: 0.15, f1: 1800 })
    this._noise(0.16, { type: 'highpass', f0: 2500, gain: 0.18 })
  }
  coin() {
    this._tone(1046, 0.12, { type: 'sine', gain: 0.08 })
    this._tone(1568, 0.22, { type: 'sine', gain: 0.06, delay: 0.07 })
  }
  heal() {
    this._tone(523, 0.22, { type: 'sine', gain: 0.09 })
    this._tone(784, 0.3, { type: 'sine', gain: 0.07, delay: 0.09 })
    this._tone(1046, 0.4, { type: 'sine', gain: 0.05, delay: 0.18 })
  }
  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((f, i) => this._tone(f, 0.5, { type: 'triangle', gain: 0.09, delay: i * 0.09 }))
  }
  hurt() {
    this._noise(0.22, { type: 'lowpass', f0: 700, f1: 90, gain: 0.3 })
    this._tone(110, 0.3, { type: 'sawtooth', gain: 0.1, f1: 55 })
  }
  dash() {
    this._noise(0.26, { type: 'bandpass', f0: 500, f1: 2200, q: 1.4, gain: 0.14 })
  }
  jump() {
    this._tone(320, 0.16, { type: 'sine', gain: 0.06, f1: 620 })
  }
  interact() {
    this._tone(880, 0.09, { type: 'sine', gain: 0.06 })
    this._tone(1320, 0.14, { type: 'sine', gain: 0.04, delay: 0.06 })
  }
  ui() {
    this._tone(740, 0.06, { type: 'sine', gain: 0.045 })
  }
  deny() {
    this._tone(180, 0.12, { type: 'square', gain: 0.05, f1: 120 })
  }
  death() {
    this._tone(220, 0.8, { type: 'sawtooth', gain: 0.1, f1: 55 })
    this._noise(0.7, { type: 'lowpass', f0: 400, f1: 60, gain: 0.2 })
  }
  bossRoar() {
    this._tone(70, 0.9, { type: 'sawtooth', gain: 0.22, f1: 42 })
    this._noise(0.9, { type: 'lowpass', f0: 500, f1: 90, gain: 0.28 })
  }
  bossSlam() {
    this._noise(0.5, { type: 'lowpass', f0: 700, f1: 45, q: 0.7, gain: 0.45 })
    this._tone(62, 0.45, { type: 'sine', gain: 0.3, f1: 28 })
  }
  victory() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5]
    seq.forEach((f, i) => this._tone(f, 0.55, { type: 'triangle', gain: 0.08, delay: i * 0.13 }))
  }
}
