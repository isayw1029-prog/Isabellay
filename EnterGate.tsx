import './enterGate.css'

type Props = { onEnter: (sound: boolean) => void }

function EnterWord({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  return <button className={`enter-gate__word${muted ? ' enter-gate__word--muted' : ''}`} type="button" onPointerDown={() => { try { sessionStorage.setItem('portfolioSound', muted ? 'off' : 'on') } catch {} }} onClick={onClick} aria-label={muted ? 'Enter with no sound' : 'Enter'}>
    <span className="enter-gate__letter">E</span><span className="enter-gate__letter">N</span><span className="enter-gate__letter">T</span><span className="enter-gate__letter">E</span><span className="enter-gate__letter">R</span>
    <span className="enter-gate__caption">{muted ? 'ENTER WITH NO SOUND' : 'ENTER'}</span>
  </button>
}

function EnterIsland({ variant }: { variant: "day" | "quiet" }) {
  return <div className={`enter-gate__island enter-gate__island--${variant}`} aria-hidden><span className="enter-gate__islandRock" /><span className="enter-gate__islandTop" /><span className="enter-gate__islandTree" /><i /><b /></div>
}

export default function EnterGate({ onEnter }: Props) {
  return <div className="enter-gate" role="dialog" aria-label="Enter Isabella Yang portfolio">
    <div className="enter-gate__choices">
      <div className="enter-gate__choice"><EnterWord muted={false} onClick={() => onEnter(true)} /><EnterIsland variant="day" /></div>
      <div className="enter-gate__choice"><EnterWord muted={true} onClick={() => onEnter(false)} /><EnterIsland variant="quiet" /></div>
    </div>
  </div>
}

