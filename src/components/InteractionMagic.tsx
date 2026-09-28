import { useEffect, useRef } from 'react'
import './interactionMagic.css'

function chime(ctx: AudioContext, at: number, frequency: number, volume: number) {
  const tone = ctx.createOscillator()
  const gain = ctx.createGain()
  tone.type = 'sine'
  tone.frequency.setValueAtTime(frequency, at)
  tone.frequency.exponentialRampToValueAtTime(frequency * .992, at + .72)
  gain.gain.setValueAtTime(.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + .018)
  gain.gain.exponentialRampToValueAtTime(.0001, at + .92)
  tone.connect(gain)
  gain.connect(ctx.destination)
  tone.start(at)
  tone.stop(at + .94)
}

export default function InteractionMagic({ night = false }: { night?: boolean }) {
  const layer = useRef<HTMLDivElement>(null)
  const audio = useRef<AudioContext | null>(null)
  const lastPlayed = useRef(0)
  const music = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const musicUrl = 'https://john-and-patricias-comfort-site-about-attachment-styles.com/audio/music/Married_Life.mp3'
    const syncMusic = () => {
      if (sessionStorage.getItem('portfolioSound') === 'on') {
        music.current ??= new Audio(musicUrl)
        music.current.preload = 'auto'
        music.current.loop = true
        music.current.onended = () => {
          if (sessionStorage.getItem('portfolioSound') === 'on' && music.current) {
            music.current.currentTime = 0
            void music.current.play().catch(() => {})
          }
        }
        music.current.volume = 0.22
        void music.current.play().catch(() => {})
      } else if (music.current) {
        music.current.pause()
      }
    }
    const play = () => {
      const now = performance.now()
      if (now - lastPlayed.current < 110) return
      lastPlayed.current = now
      try {
        audio.current ??= new AudioContext()
        if (audio.current.state === 'suspended') void audio.current.resume()
        const t = audio.current.currentTime
        const note = [784, 988, 1175][Math.floor(Math.random() * 3)]
        chime(audio.current, t, note, .019)
        chime(audio.current, t + .028, note * 1.5, .008)
      } catch {
        // Keep the interaction available when Web Audio is unavailable.
      }
    }

    const sparkle = (event: PointerEvent) => {
      syncMusic()
      const host = layer.current
      if (!host) return
      const burst = document.createElement('span')
      burst.className = 'click-spark'
      burst.style.left = `${event.clientX}px`
      burst.style.top = `${event.clientY}px`
      for (let i = 0; i < 8; i++) {
        const star = document.createElement('i')
        star.style.setProperty('--spark-angle', `${i * 45 + (Math.random() * 12 - 6)}deg`)
        star.style.setProperty('--spark-delay', `${Math.random() * 70}ms`)
        burst.append(star)
      }
      host.append(burst)
      window.setTimeout(() => burst.remove(), 900)
      const target = event.target
      if (target instanceof Element && target.closest('button,a,[role="button"],canvas,input,textarea') && sessionStorage.getItem('portfolioSound') === 'on') play()
    }

    window.addEventListener('pointerdown', sparkle, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', sparkle)
      music.current?.pause()
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const target = night ? 0.13 : 0.22
    const tick = () => {
      if (music.current && sessionStorage.getItem('portfolioSound') === 'on') {
        music.current.volume += (target - music.current.volume) * 0.08
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [night])

  return <div ref={layer} className="interaction-magic" aria-hidden="true" />
}

