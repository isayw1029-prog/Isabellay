import { useRef, type CSSProperties, type MutableRefObject } from 'react'
import './beadCurtain.css'

const STRANDS = 70

function ringTone(ctx: AudioContext, frequency: number, start: number, gainValue: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.996, start + 0.9)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.15)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + 1.16)
}

function playChime(context: MutableRefObject<AudioContext | null>, last: MutableRefObject<number>) {
  const now = performance.now()
  if (now - last.current < 130) return
  last.current = now
  try {
    const Audio = window.AudioContext
    if (!Audio) return
    context.current ??= new Audio()
    if (context.current.state === 'suspended') void context.current.resume()
    const time = context.current.currentTime
    const notes = [659.25, 783.99, 987.77, 1174.66]
    const note = notes[Math.floor(Math.random() * notes.length)]
    ringTone(context.current, note, time, 0.034)
    ringTone(context.current, note * 1.5, time + 0.025, 0.012)
  } catch {
    // Browsers without Web Audio keep the curtain visual and fully usable.
  }
}

export default function BeadCurtain() {
  const audio = useRef<AudioContext | null>(null)
  const lastChime = useRef(0)
  return (
    <div className="bead-curtain" aria-label="A glass bead curtain; move across it to hear a soft chime">
      {Array.from({ length: STRANDS }, (_, strand) => (
        <button
          key={strand}
          type="button"
          className="bead-curtain__strand"
          aria-label="Glass bead strand"
          onPointerEnter={() => playChime(audio, lastChime)}
          style={{
            '--strand': strand,
            '--length': `${44 + ((strand * 29) % 57)}%`,
            '--sway': `${(strand % 5) * -0.18}s`,
            '--duration': `${4.2 + (strand % 7) * 0.28}s`,
          } as CSSProperties}
        >
          {Array.from({ length: 21 + (strand % 11) }, (_, bead) => (
            <i key={bead} className="bead-curtain__bead" />
          ))}
        </button>
      ))}
      <span className="bead-curtain__rail" aria-hidden />
      <span className="bead-curtain__tassel" aria-hidden />
    </div>
  )
}
