type Props = { night: boolean; onToggle: () => void }
export default function DayNightToggle({ night, onToggle }: Props) {
  return <button type="button" className={`day-night-toggle${night ? " is-night" : ""}`} aria-pressed={night} aria-label={night ? "Switch to day mode" : "Switch to night mode"} onClick={onToggle}>
    <span className="day-night-toggle__orb" aria-hidden />
    <span>{night ? "NIGHT" : "DAY"}</span><i aria-hidden>{night ? "☾" : "☼"}</i>
  </button>
}
