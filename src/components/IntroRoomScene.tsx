import type { CSSProperties } from 'react'

type Stage = 'room' | 'focusing-desk' | 'desk' | 'island' | 'focusing-island'
type Props = { stage: Stage; pointerX: number; pointerY: number; dragYaw: number }

export default function IntroRoomScene({ stage, pointerX, pointerY, dragYaw }: Props) {
  const closeFactor = stage === 'desk' || stage === 'island' ? .55 : 1
  const style = {
    '--room-yaw': `${(pointerX * 1.6 + dragYaw * .17) * closeFactor}deg`,
    '--room-pitch': `${pointerY * -0.7 * closeFactor}deg`,
  } as CSSProperties
  return <div className="intro-room__room-image" aria-hidden style={style} />
}


