import { lazy, Suspense, useEffect, useState } from 'react'
import Loader from './components/Loader'
import Reveal from './components/Reveal'
import Nav from './components/Nav'
import InteractionMagic from './components/InteractionMagic'
import IntroRoom from './components/IntroRoom'
import EnterGate from './components/EnterGate'
import DayNightToggle from './components/DayNightToggle'
import './components/dayNightToggle.css'
import OverlayHost from './components/overlays/OverlayHost'
import { StaticFallback, useCapabilities } from './components/fallback'
import ExperienceOrchestrator from './experience/ExperienceOrchestrator'
import { useStore } from './store'
import { PHOTOS } from './data/content'
import { preloadPhotoAssets } from './components/work/PhotoAsset'

/**
 * three + R3F 鏈?240KB gzip锛岀嫭绔嬫垚 chunk锛岀粷涓嶈繘涓诲寘銆? *
 * `lazy` 鍙湁鍦ㄧ湡姝ｆ覆鏌撳埌瀹冩椂鎵嶅彂璧?import锛岃€屽畠瑕佺瓑 Loader 璧板畬
 * phase 鍒囧埌 scene 鎵嶈娓叉煋 鈥斺€?浜庢槸銆屼笅杞借В鏋?904KB 鐨?three銆嶅拰
 * 銆屽姞杞介灞忓浘鐗囥€嶅彉鎴愪覆琛岋紝瀹炴祴鍦?t0+1.5s 澶勬湁 384ms 鐨勪富绾跨▼闀垮仠椤裤€? * 杩欓噷鍦ㄦā鍧楁眰鍊兼椂灏辨妸 import 鍙戝嚭鍘伙紙**鍙槸棰勭儹锛屼笉娓叉煋**锛夛紝
 * chunk 鐨勪笅杞借В鏋愬拰 Loader 鐨勮祫婧愬姞杞藉苟琛岃窇锛岄暱鍋滈】琚憡鎺夈€? */
const heroChunk = () => import('./scene/HeroSceneCanvas')
const HeroSceneCanvas = lazy(heroChunk)
void heroChunk()

export default function App() {
  const phase = useStore((s) => s.phase)
  const send = useStore((s) => s.send)
  const overlay = useStore((s) => s.overlay)
  const [entered, setEntered] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)
  const [night, setNight] = useState(() => { try { return localStorage.getItem("portfolioTheme") === "night" } catch { return false } })
  const toggleTheme = () => setNight((value) => { const next = !value; try { localStorage.setItem("portfolioTheme", next ? "night" : "day") } catch {} return next })
  const openOverlay = useStore((s) => s.openOverlay)
  const caps = useCapabilities()
  const showScene = phase !== 'loading'

  /*
   * 闈欐€侀檷绾у垎鏀笉璺?Loader / 鎻箷 / 寮€鍦猴紝浣嗙姸鎬佹満涓嶈兘鍋滃湪 `loading` 鈥斺€?   * `REQUEST_OVERLAY` 鍦ㄥ満鏅笉鍙鏃舵槸琚拷鐣ョ殑锛屽洓涓叆鍙ｄ細鐐逛笉寮€銆?   * 杩欓噷鎶婂畠涓€娆℃€ф帹鍒般€岄潤鎬佸紑鏌溿€嶈繖涓ǔ瀹氭€侊紝璇箟涓婃濂藉搴旈潤鎬佺増鏈€?   */
  useEffect(() => {
    if (!caps.shouldFallback) return
    useStore.getState().setPhase('scene')
  }, [caps.shouldFallback])

  useEffect(() => {
    const timer = window.setTimeout(() => { void preloadPhotoAssets(PHOTOS) }, 250)
    return () => window.clearTimeout(timer)
  }, [])

  // 寮€鍙戞湡鐩磋揪锛??v=about&w=design
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const q = new URLSearchParams(location.search)
    const v = q.get('v')
    if (!v) return
    const st = useStore.getState()
    st.setPhase('scene')
    st.openOverlay(v as never)
    const w = q.get('w')
    if (w) setTimeout(() => useStore.getState().setWorkView(w as never), 60)
  }, [])

  if (!introComplete) return <IntroRoom onComplete={() => setIntroComplete(true)} />

  /*
   * 鏃?WebGL / Save-Data / 浣庢€ц兘璁惧璧伴潤鎬佺増鏈€?   * 鍒ゅ埌闄嶇骇灏卞畬鍏ㄤ笉鎸?Canvas 鈥斺€?杩欎簺璁惧涓婅繛鍒涘缓涓婁笅鏂囬兘鍙兘澶辫触锛?   * 鎸備笂鍘诲彧浼氬緱鍒颁竴鍧楃┖鐧界敾甯冿紝姝ｆ槸闄嶇骇瑕侀伩鍏嶇殑銆?   * 鍐呭娴眰鍜屽鑸収甯稿彲鐢紝鎵€浠ュ洓涓叆鍙ｄ竴涓兘涓嶅皯銆?   */
  if (caps.shouldFallback) {
    return (
      <div className={`stage${night ? " stage--night" : ""}`}>
        <InteractionMagic night={night} />
        <StaticFallback
          reason={caps.reason}
          activeId={overlay}
          onSelect={(id) => openOverlay(id)}
        />
        <OverlayHost />
      </div>
    )
  }

  return (
    <div className={`stage${night ? " stage--night" : ""}`}>
      <InteractionMagic night={night} />
      {/* 鍦烘櫙鐘舵€佹満鐨勬椂閽熶笌 Reduced Motion 鍚屾锛氫笉娓叉煋浠讳綍涓滆タ */}
      <ExperienceOrchestrator />
      {showScene && (
        <Suspense fallback={null}>
          <HeroSceneCanvas night={night} />
        </Suspense>
      )}
      {phase === 'scene' && entered && <><Nav /><DayNightToggle night={night} onToggle={toggleTheme} /></>}

      {/* 鍥涗釜娴眰鐨勭粺涓€瀹夸富锛歞ialog 璇箟銆佽儗鏅?inert銆乫ocus trap銆?          閫€鍑哄姩鐢绘挱瀹屾墠鍗歌浇銆佺劍鐐瑰綊杩橈紝鍏ㄩ儴鍦?OverlayHost 鍐呴儴瀹屾垚 */}
      <OverlayHost />

      {/* Loader / Reveal 鐩存帴鎶婂畬鎴愪簨浠舵姇缁欑姸鎬佹満銆?          涓嶈兘鍐嶈蛋 store 鐨?setPhase 鍏煎灞?鈥斺€?閭ｆ潯璺噷 'scene' 浼氳繛鍙?          ASSETS_READY + REVEAL_DONE + SKIP_INTRO锛屾渶鍚庝竴鍙戠洿鎺ユ妸寮€鍦鸿烦杩囥€?          寮€鍙戞湡鐩磋揪 ?v= 浠嶇劧璧板吋瀹瑰眰锛岄偅绉嶅満鍚堟湰鏉ュ氨璇ヨ烦杩囧紑鍦恒€?*/}
      {phase === 'loading' && <Loader onReady={() => send({ type: 'ASSETS_READY' })} />}
      {phase === 'reveal' && <Reveal onDone={() => send({ type: 'REVEAL_DONE' })} />}
      {phase !== 'loading' && !entered && <EnterGate onEnter={() => setEntered(true)} />}
    </div>
  )
}










