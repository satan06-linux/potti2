import { useEffect, useRef } from 'react'

/* ── Vanilla 3D floating particles ──────────────────────────── */
export function useParticles() {
  useEffect(() => {
    const canvas = document.getElementById('particles-canvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    let raf

    const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light'

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random() * 400 + 100,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1,
    }))

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const color = isDark() ? '100,160,255' : '37,99,235'

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        if (p.z < 50) p.z = 500; if (p.z > 500) p.z = 50

        const scale = 400 / p.z
        const sx = (p.x - W / 2) * scale + W / 2
        const sy = (p.y - H / 2) * scale + H / 2
        const alpha = Math.min(1, scale * 0.6)
        const radius = p.r * scale

        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(0.5, radius), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color},${alpha.toFixed(2)})`
        ctx.fill()
      })

      // Draw connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const scaleA = 400 / a.z, scaleB = 400 / b.z
          const ax = (a.x - W/2)*scaleA + W/2, ay = (a.y - H/2)*scaleA + H/2
          const bx = (b.x - W/2)*scaleB + W/2, by = (b.y - H/2)*scaleB + H/2
          const dist = Math.hypot(ax - bx, ay - by)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(ax, ay)
            ctx.lineTo(bx, by)
            ctx.strokeStyle = `rgba(${color},${((1 - dist/100)*0.25).toFixed(2)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
}

/* ── Vanilla 3D card tilt on mouse move ─────────────────────── */
export function useTilt(ref, { max = 12, scale = 1.03, speed = 300 } = {}) {
  useEffect(() => {
    const el = ref?.current
    if (!el) return

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width  / 2
      const cy = rect.top  + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width  / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)
      const rotX = -dy * max
      const rotY =  dx * max
      el.style.transition = `transform ${speed}ms ease`
      el.style.transform  = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`
    }

    const onLeave = () => {
      el.style.transition = `transform ${speed}ms ease`
      el.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)'
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [ref, max, scale, speed])
}

/* ── Apply tilt to ALL .card elements on a page ─────────────── */
export function useAutoTilt() {
  useEffect(() => {
    const cards = document.querySelectorAll('.card')

    const handlers = []
    cards.forEach(el => {
      const onMove = (e) => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width  / 2
        const cy = rect.top  + rect.height / 2
        const dx = (e.clientX - cx) / (rect.width  / 2)
        const dy = (e.clientY - cy) / (rect.height / 2)
        el.style.transition = 'transform 0.15s ease'
        el.style.transform  = `perspective(700px) rotateX(${-dy*8}deg) rotateY(${dx*8}deg) scale(1.02)`
      }
      const onLeave = () => {
        el.style.transition = 'transform 0.3s ease'
        el.style.transform  = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)'
      }
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      handlers.push({ el, onMove, onLeave })
    })

    return () => {
      handlers.forEach(({ el, onMove, onLeave }) => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
      })
    }
  })
}
