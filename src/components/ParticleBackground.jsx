import { useEffect, useRef } from 'react'

export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let particles = []
    let animationFrameId
    let mouse = { x: null, y: null, radius: 150 }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', (event) => {
      mouse.x = event.x
      mouse.y = event.y
    })

    resize()

    class Particle {
      constructor() {
        this.reset()
      }

      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 1.2 + 0.3
        // Velocidad muy lenta para efecto de flotación
        this.speedX = (Math.random() - 0.5) * 0.25
        this.speedY = (Math.random() - 0.5) * 0.25
      }

      update() {
        // Movimiento autónomo constante
        this.x += this.speedX
        this.y += this.speedY

        // Variación aleatoria suave de velocidad (jitter)
        this.speedX += (Math.random() - 0.5) * 0.01
        this.speedY += (Math.random() - 0.5) * 0.01
        
        // Limitar velocidad máxima para que no se acelere demasiado
        const maxSpeed = 0.3
        if (this.speedX > maxSpeed) this.speedX = maxSpeed
        if (this.speedX < -maxSpeed) this.speedX = -maxSpeed
        if (this.speedY > maxSpeed) this.speedY = maxSpeed
        if (this.speedY < -maxSpeed) this.speedY = -maxSpeed

        // Reaparecer por el lado opuesto (infinito)
        if (this.x > canvas.width) this.x = 0
        if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        if (this.y < 0) this.y = canvas.height

        // Interacción suave con el mouse (atracción gravitacional)
        if (mouse.x != null && mouse.y != null) {
          let dx = mouse.x - this.x
          let dy = mouse.y - this.y
          let distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius
            this.x += (dx / distance) * force * 1.5
            this.y += (dy / distance) * force * 1.5
          }
        }
      }

      draw() {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.45)'
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const init = () => {
      particles = []
      // Más partículas pero más pequeñas
      const numberOfParticles = (canvas.width * canvas.height) / 5500
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle())
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        particles[i].update()
        particles[i].draw()
      }
      connect()
      animationFrameId = requestAnimationFrame(animate)
    }

    const connect = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let dx = particles[a].x - particles[b].x
          let dy = particles[a].y - particles[b].y
          let distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 140) {
            const opacity = 0.2 * (1 - distance / 140)
            ctx.strokeStyle = `rgba(100, 150, 255, ${opacity})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(particles[a].x, particles[a].y)
            ctx.lineTo(particles[b].x, particles[b].y)
            ctx.stroke()
          }
        }
      }
    }

    init()
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-100"
      style={{ background: 'transparent' }}
    />
  )
}
