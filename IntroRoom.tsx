import { useEffect, useRef, useState, type PointerEvent } from 'react'
import './introRoom.css'
import IntroRoomScene from './IntroRoomScene'

type Props = { onComplete: () => void }
type Stage = 'room' | 'focusing-desk' | 'desk' | 'island' | 'focusing-island'

export default function IntroRoom({ onComplete }: Props) {
  const [stage, setStage] = useState<Stage>('room')
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [dragYaw, setDragYaw] = useState(0)
  const drag = useRef<{ pointerId: number; startX: number; startYaw: number; lastX: number; velocity: number } | null>(null)
  const inertia = useRef<number | null>(null)

  useEffect(() => () => {
    if (inertia.current !== null) cancelAnimationFrame(inertia.current)
  }, [])

  const canExplore = stage === 'room' || stage === 'desk' || stage === 'island'
  const range = stage === 'room' ? 8 : 4

  const followPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setPointer({
      x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)),
      y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1)),
    })
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    const delta = event.clientX - active.startX
    const next = Math.max(-range, Math.min(range, active.startYaw + (delta / Math.max(rect.width, 1)) * 16))
    active.velocity = event.clientX - active.lastX
    active.lastX = event.clientX
    setDragYaw(next)
  }

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!canExplore || (event.target as HTMLElement).closest('button')) return
    if (inertia.current !== null) cancelAnimationFrame(inertia.current)
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startYaw: dragYaw, lastX: event.clientX, velocity: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    let velocity = active.velocity * 0.035
    const settle = () => {
      velocity *= 0.88
      setDragYaw((current) => Math.max(-range, Math.min(range, current + velocity)))
      if (Math.abs(velocity) > 0.015) inertia.current = requestAnimationFrame(settle)
      else inertia.current = null
    }
    inertia.current = requestAnimationFrame(settle)
  }

  const focusDesk = () => {
    if (stage !== 'room') return
    setPointer({ x: 0, y: 0 })
    setDragYaw(0)
    setStage('focusing-desk')
    window.setTimeout(() => setStage('desk'), 1250)
    window.setTimeout(() => setStage('island'), 3400)
  }

  const focusIsland = () => {
    if (stage !== 'island') return
    setPointer({ x: 0, y: 0 })
    setDragYaw(0)
    setStage('focusing-island')
    window.setTimeout(onComplete, 1450)
  }

  return (
    <div
      className={`intro-room intro-room--${stage}`}
      aria-label="Interactive childhood room introduction"
      onPointerMove={followPointer}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
      onPointerDown={startDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="intro-room__scene-frame">
        <IntroRoomScene stage={stage} pointerX={pointer.x} pointerY={pointer.y} dragYaw={dragYaw} />
        {stage === 'room' ? (
          <button className="intro-room__desk-hotspot" type="button" onClick={focusDesk} aria-label="Explore the desk">
            <span className="intro-room__ring" />
            <span className="intro-room__desk-label">CLICK THE DESK</span>
          </button>
        ) : null}
        {stage === 'island' || stage === 'focusing-island' ? (
          <button className="intro-room__island" type="button" onClick={focusIsland} aria-label="Enter through the floating island">
            <img src="/assets/intro/floating-island.png" alt="Green low-poly floating island" />
            <span>CLICK THE ISLAND</span>
          </button>
        ) : null}
      </div>
      <div className="intro-room__copy" aria-live="polite">
        {stage === 'room' && <p>MOVE YOUR MOUSE TO EXPLORE · DRAG TO LOOK AROUND</p>}
        {stage === 'focusing-desk' && <p>FOCUSING ON THE DESK…</p>}
        {stage === 'desk' && <p>DRAG LEFT / RIGHT TO EXPLORE THE DESKTOP</p>}
        {stage === 'island' && <p>DRAG TO LOOK AROUND · CLICK THE ISLAND</p>}
        {stage === 'focusing-island' && <p>OPENING…</p>}
      </div>
    </div>
  )
}

