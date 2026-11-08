// Tiny procedural audio engine: ambience, music and combat SFX with no assets.
export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.musicGain = null
    this.sfxGain = null
    this.started = false
    this.musicTimer = 0
    this.step = 0
  }

  start() {
    if (this.started) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.55
    this.master.connect(this.ctx.destination)

    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0.16
    this.musicGain.connect(this.master)
    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = 0.7
    this.sfxGain.connect(this.master)

    this.started = true
    this.ctx.resume()
    this.startWind()
    this.startPad()
    this.scheduleMusic()
  }

  startWind() {
    const ctx = this.ctx
    const len = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.985 + white * 0.015
      data[i] = last * 2.2
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 480
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.025
    lfo.connect(lfoGain).connect(gain.gain)
    src.connect(filter).connect(gain).connect(this.master)
    src.start()
    lfo.start()
  }

  startPad() {
    const ctx = this.ctx
    const notes = [110, 164.81, 220, 329.63]
    this.padOscs = notes.map((f, i) => {
      const o = ctx.createOscillator()
      o.type = i % 2 ? 'triangle' : 'sine'
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 6
      const g = ctx.createGain()
      g.gain.value = 0.018
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 700
      o.connect(filter).connect(g).connect(this.musicGain)
      o.start()
      return { o, g, base: f }
    })
    // Slow shimmering chord movement.
    setInterval(() => {
      if (!this.ctx) return
      const t = this.ctx.currentTime
      const roots = [110, 98, 123.47, 87.31]
      const root = roots[Math.floor(Math.random() * roots.length)]
      const ratios = [1, 1.5, 2, 2.997]
      this.padOscs.forEach((p, i) => {
        p.o.frequency.setTargetAtTime(root * ratios[i], t, 3.5)
      })
    }, 14000)
  }

  scheduleMusic() {
    const patterns = [
      [0, 3, 5, 7, 5, 3, 7, 10],
      [0, 2, 3, 7, 5, 3, 2, 0],
      [0, 5, 7, 12, 10, 7, 5, 3]
    ]
    const scale = [220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33]
    const play = () => {
      if (!this.ctx) return
      const pattern = patterns[this.step % patterns.length]
      const noteIdx = pattern[Math.floor(Math.random() * pattern.length)]
      const freq = scale[noteIdx] * 2
      if (Math.random() < 0.72) this.pluck(freq, 0.045, 2.6)
      if (this.step % 4 === 0) this.pluck(scale[noteIdx] * 0.5, 0.05, 4)
      this.step++
      this.musicTimer = setTimeout(play, 780 + Math.random() * 500)
    }
    this.musicTimer = setTimeout(play, 2000)
  }

  pluck(freq, vol = 0.05, decay = 2.5) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2200
    o.connect(filter).connect(g).connect(this.musicGain)
    o.start(t)
    o.stop(t + decay + 0.1)
  }

  noiseBurst({ dur = 0.18, vol = 0.35, type = 'highpass', freq = 900, freqEnd = 2600, q = 0.8 } = {}) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const len = Math.ceil(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
    filter.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(this.sfxGain)
    src.start(t)
  }

  tone({ freq = 440, dur = 0.2, vol = 0.2, type = 'sine', slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.sfxGain)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  swing(heavy = false) {
    this.noiseBurst({ dur: heavy ? 0.3 : 0.16, vol: heavy ? 0.42 : 0.26, freq: 600, freqEnd: heavy ? 3400 : 2600, q: 1.4 })
    if (heavy) this.tone({ freq: 90, dur: 0.2, vol: 0.14, type: 'sawtooth', slide: -40 })
  }

  hit(crit = false) {
    this.noiseBurst({ dur: 0.12, vol: 0.4, type: 'bandpass', freq: 1800, freqEnd: 700, q: 1.1 })
    this.tone({ freq: crit ? 320 : 180, dur: 0.16, vol: 0.24, type: 'square', slide: -100 })
    if (crit) this.tone({ freq: 880, dur: 0.12, vol: 0.08, type: 'triangle', slide: 300 })
  }

  hurt() {
    this.tone({ freq: 140, dur: 0.3, vol: 0.26, type: 'sawtooth', slide: -70 })
    this.noiseBurst({ dur: 0.22, vol: 0.28, freq: 500, freqEnd: 180 })
  }

  dodge() {
    this.noiseBurst({ dur: 0.3, vol: 0.2, freq: 300, freqEnd: 1400 })
  }

  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.5, vol: 0.12, type: 'triangle', delay: i * 0.09 }))
    this.tone({ freq: 261.63, dur: 1.2, vol: 0.06, type: 'sine', delay: 0.1 })
  }

  questComplete() {
    ;[392, 523.25, 659.25].forEach((f, i) => this.tone({ freq: f, dur: 0.45, vol: 0.1, type: 'triangle', delay: i * 0.11 }))
  }

  potion() {
    this.tone({ freq: 660, dur: 0.16, vol: 0.12, type: 'sine', slide: 320 })
    this.tone({ freq: 990, dur: 0.3, vol: 0.08, type: 'sine', slide: 220, delay: 0.12 })
  }

  ui() {
    this.tone({ freq: 780, dur: 0.06, vol: 0.07, type: 'square' })
  }

  death() {
    this.tone({ freq: 220, dur: 1.6, vol: 0.2, type: 'sawtooth', slide: -170 })
    this.tone({ freq: 110, dur: 2.0, vol: 0.12, type: 'sine', slide: -60 })
  }

  enemyDie() {
    this.noiseBurst({ dur: 0.45, vol: 0.25, type: 'lowpass', freq: 900, freqEnd: 120 })
    this.tone({ freq: 130, dur: 0.4, vol: 0.14, type: 'triangle', slide: -80 })
  }
}
