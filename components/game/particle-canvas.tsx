"use client"

import { useEffect, useRef } from "react"

type ParticleType = "spark" | "dust" | "hit" | "confetti" | "muzzle" | "ember"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  type: ParticleType
  color: string
}

interface EmitOptions {
  x: number
  y: number
  count?: number
  type: ParticleType
  color?: string
  spread?: number
  speed?: number
}

export function useParticleSystem(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const emittersRef = useRef<EmitOptions[]>([])

  const spawn = (opts: EmitOptions) => {
    const count = opts.count ?? 12
    const angle = opts.spread ?? Math.PI
    const baseAngle = angle === Math.PI ? -Math.PI / 2 : (Math.random() - 0.5) * angle
    const colors = {
      spark: ["#fbbf24", "#f59e1e", "#dc2626"],
      dust: ["#a8a29e", "#78716c", "#575049"],
      hit: ["#fbbf24", "#ffffff"],
      confetti: ["#d4af37", "#22c55e", "#ef4444", "#3b82f6"],
      muzzle: ["#fbbf24", "#ffffff"],
      ember: ["#ea580c", "#dc2626", "#7c2d12"],
    }
    const palette = colors[opts.type] || colors.spark
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (Math.random() - 0.5) * angle
      const s = opts.speed ?? 2
      particlesRef.current.push({
        x: opts.x,
        y: opts.y,
        vx: Math.cos(a) * s * Math.random() * 0.6 - Math.cos(a) * s * 0.3,
        vy: Math.sin(a) * s * Math.random() * 0.6 - Math.sin(a) * s * 0.3 + (opts.type === "confetti" ? -0.3 : 0),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.6,
        size: (opts.type === "confetti" ? 4 : 2) + Math.random() * (opts.type === "confetti" ? 3 : 3),
        type: opts.type,
        color: palette[Math.floor(Math.random() * palette.length)].replace("_", ""),
      })
    }
  }

  const spawnEmitter = (opts: Omit<EmitOptions, "count"> & { count: number }) => {
    spawn(opts)
  }

  useEffect(() => {
    const canvas = canvasRef?.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }
    resize()
    window.addEventListener("resize", resize)

    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const alive = []
      for (const p of particlesRef.current) {
        p.life += dt
        if (p.life < p.maxLife) {
          if (p.type === "confetti") {
            p.vy += 0.3
          } else if (p.type === "spark") {
            p.vy += 0.5
          }
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.97
          p.vy *= 0.97
          const alpha = 1 - p.life / p.maxLife
          ctx.globalAlpha = alpha
          ctx.fillStyle = p.color
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
          alive.push(p)
        }
      }
      particlesRef.current = alive
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [canvasRef])

  return { spawn: spawnEmitter }
}
