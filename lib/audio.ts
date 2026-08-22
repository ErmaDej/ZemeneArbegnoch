"use client"

type SFXName =
  | "click"
  | "gather"
  | "upgrade"
  | "battleStart"
  | "clash"
  | "whoosh"
  | "victory"
  | "defeat"
  | "triviaCorrect"
  | "triviaWrong"
  | "levelUp"
  | "enemyPop"
  | "sniperShot"
  | "hitConfirm"
  | "miss"
  | "timeWarning"
  | "tabSwitch"
  | "referralCopy"

interface AudioManager {
  init: () => void
  play: (name: SFXName, volume?: number) => void
  setMuted: (muted: boolean) => void
  isMuted: () => boolean
  isReady: () => boolean
}

let ctx: AudioContext | null = null
let mutedState = false
let initialized = false
const bufferCache = new Map<SFXName, AudioBuffer>()

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx || ctx.state === "closed") {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: "interactive",
      })
    } catch {
      return null
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {})
  }
  return ctx
}

function makeBuffer(samples: number[]): AudioBuffer | null {
  const audioCtx = ensureContext()
  if (!audioCtx) return null
  const buffer = audioCtx.createBuffer(1, samples.length, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) data[i] = samples[i]
  return buffer
}

function playBuffer(buffer: AudioBuffer | null, volume: number) {
  if (!buffer || mutedState) return
  const audioCtx = ensureContext()
  if (!audioCtx) return
  try {
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    const gain = audioCtx.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(audioCtx.destination)
    source.start(0)
  } catch {
    // Silent fail — audio must never block gameplay.
  }
}

function squareWave(freq: number, duration: number, sampleRate: number): number[] {
  const samples: number[] = []
  const period = sampleRate / freq
  for (let i = 0; i < duration * sampleRate; i++) {
    samples[i] = ((i % period) / period < 0.5 ? 1 : -1) * 0.15
  }
  return samples
}

function sineWave(freq: number, duration: number, sampleRate: number): number[] {
  const samples: number[] = []
  const TAU = Math.PI * 2
  for (let i = 0; i < duration * sampleRate; i++) {
    samples[i] = Math.sin((TAU * freq * i) / sampleRate) * 0.15
  }
  return samples
}

function noise(duration: number, sampleRate: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < duration * sampleRate; i++) {
    samples[i] = (Math.random() * 2 - 1) * 0.15
  }
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= Math.pow(1 - i / samples.length, 2)
  }
  return samples
}

function risingSweep(duration: number, sampleRate: number): number[] {
  const samples: number[] = []
  const TAU = Math.PI * 2
  for (let i = 0; i < duration * sampleRate; i++) {
    const t = i / sampleRate
    const freq = 200 + t * 800
    samples[i] = Math.sin(TAU * freq * t) * 0.12 * Math.pow(1 - t / duration, 0.5)
  }
  return samples
}

function fallingSweep(duration: number, sampleRate: number): number[] {
  const samples: number[] = []
  const TAU = Math.PI * 2
  for (let i = 0; i < duration * sampleRate; i++) {
    const t = i / sampleRate
    const freq = 600 - t * 400
    samples[i] = Math.sin(TAU * freq * t) * 0.12 * Math.pow(1 - t / duration, 0.5)
  }
  return samples
}

function pluckString(duration: number, sampleRate: number): number[] {
  const samples: number[] = []
  const freq = 330 + Math.random() * 100
  const TAU = Math.PI * 2
  for (let i = 0; i < duration * sampleRate; i++) {
    const t = i / sampleRate
    const env = Math.exp(-t * 6)
    samples[i] = Math.sin(TAU * freq * t) * 0.12 * env
  }
  return samples
}

function arpeggio(freqs: number[], duration: number, sampleRate: number): number[] {
  const TAU = Math.PI * 2
  const perNote = duration / freqs.length
  const samples: number[] = []
  let idx = 0
  for (let i = 0; i < duration * sampleRate; i++) {
    const t = i / sampleRate
    const noteIdx = Math.floor(t / perNote)
    const f = freqs[Math.min(noteIdx, freqs.length - 1)]
    const localT = t - noteIdx * perNote
    const env = Math.exp(-localT * 4)
    samples[i] = Math.sin(TAU * f * localT) * 0.12 * env
    idx++
  }
  return samples
}

function combine(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length)
  const result: number[] = []
  for (let i = 0; i < len; i++) {
    result[i] = (a[i] || 0) + (b[i] || 0)
  }
  return result
}

const sfxGenerators: Record<SFXName, (sr: number) => number[]> = {
  click: (sr) => squareWave(440, 0.06, sr),
  gather: (sr) => pluckString(0.18, sr),
  upgrade: (sr) => arpeggio([330, 440, 550, 660], 0.32, sr),
  battleStart: (sr) => risingSweep(0.45, sr),
  clash: (sr) => combine(noise(0.22, sr), squareWave(100, 0.22, sr)),
  whoosh: (sr) => combine(squareWave(220, 0.15, sr), squareWave(110, 0.15, sr)),
  victory: (sr) => arpeggio([523, 659, 784, 1047], 0.5, sr),
  defeat: (sr) => fallingSweep(0.4, sr),
  triviaCorrect: (sr) => arpeggio([660, 780, 880], 0.28, sr),
  triviaWrong: (sr) => combine(squareWave(220, 0.15, sr), squareWave(180, 0.15, sr)),
  levelUp: (sr) => arpeggio([523, 659, 784, 988, 1047], 0.6, sr),
  enemyPop: (sr) => combine(squareWave(180, 0.08, sr), noise(0.08, sr)),
  sniperShot: (sr) => combine(noise(0.03, sr), squareWave(880, 0.15, sr)),
  hitConfirm: (sr) => squareWave(330, 0.12, sr),
  miss: (sr) => squareWave(140, 0.2, sr),
  timeWarning: (sr) => combine(squareWave(660, 0.12, sr), squareWave(523, 0.12, sr)),
  tabSwitch: (sr) => squareWave(523, 0.05, sr),
  referralCopy: (sr) => arpeggio([780, 880, 988], 0.24, sr),
}

function getBuffer(name: SFXName): AudioBuffer | null {
  if (bufferCache.has(name)) return bufferCache.get(name)!
  const audioCtx = ensureContext()
  if (!audioCtx) return null
  const samples = sfxGenerators[name](audioCtx.sampleRate)
  const buffer = makeBuffer(samples)
  if (buffer) bufferCache.set(name, buffer)
  return buffer
}

export const audio = {
  init() {
    initialized = true
  },
  play(name: SFXName, volume = 0.18) {
    if (!initialized || mutedState) return
    const buffer = getBuffer(name)
    playBuffer(buffer, volume)
  },
  setMuted(muted: boolean) {
    mutedState = muted
    try {
      localStorage.setItem("zemene_audio_muted", String(muted))
    } catch {}
  },
  isMuted() {
    return mutedState
  },
  isReady() {
    return initialized
  },
  resume() {
    ensureContext()
  },
}

// Hydrate mute preference from localStorage
if (typeof window !== "undefined") {
  try {
    mutedState = localStorage.getItem("zemene_audio_muted") === "true"
  } catch {}
}
