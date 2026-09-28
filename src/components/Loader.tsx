import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import {
  retryFailedAssets,
  useBlockingAssets,
} from '../experience/assetManifest'
import { prefersReducedMotion } from '../hooks/useReducedMotion'
import './loader.css'

/** 鏄剧ず鍊艰拷璧剁湡瀹炲€肩殑鏈€蹇€熷害锛氭弧鏍艰嚦灏戣璧拌繖涔堜箙锛岄伩鍏嶅懡涓紦瀛樻椂 0鈫?00 涓€闂€岃繃 */
const RAMP_MS = 900
/** 100% 鐨勫彲杈ㄨ瘑鍋滈】锛堝弬鑰?100% 鏈夋槑鏄鹃】鎸級 */
const HOLD_MS = 560
/** 鏈夎祫婧愬け璐ユ椂锛岄敊璇潰鏉挎渶澶氬仠鐣欒繖涔堜箙灏变互闄嶇骇妯″紡缁х画锛岀粷涓嶆案涔呭崱浣?*/
const AUTO_CONTINUE_MS = 5_000

type Tuning = { ramp: number; hold: number; frozen: number | null }

function readTuning(): Tuning {
  // Reduced Motion锛氭樉绀哄€肩洿鎺ヨ窡鐪熷疄鍊硷紝鍙暀涓€涓兘琚湅瑙佺殑鏋佺煭鍋滈】
  if (prefersReducedMotion()) return { ramp: 0, hold: 180, frozen: null }
  if (!import.meta.env.DEV) return { ramp: RAMP_MS, hold: HOLD_MS, frozen: null }

  const q = new URLSearchParams(location.search)
  // 寮€鍙戞湡锛?loader=hold 鍐荤粨鍦ㄤ腑閫旓紝鏂逛究鏍稿瑙嗚
  if (q.get('loader') === 'hold') return { ramp: RAMP_MS, hold: HOLD_MS, frozen: 62 }
  if (q.has('fast')) return { ramp: 120, hold: 80, frozen: null }
  return { ramp: RAMP_MS, hold: HOLD_MS, frozen: null }
}

/**
 * 寮€鍦哄姞杞介〉锛? * WELCOME 宸ㄥ瀷鏍囬鐢卞簳鍚戜笂琚潚鑹插～鍏咃紝鍙充笅瑙掔櫨鍒嗘瘮閫掑锛? * 鍒?100% 骞跺仠椤夸竴甯у尯闂村悗浜ょ粰椹禌鍏嬫彮骞曞眰銆? *
 * 瑕佺偣锛? * - 鐧惧垎姣旂敱 assetManifest 鐨勭湡瀹炰簨浠堕┍鍔細姣忓紶棣栧睆闃诲鍥剧殑璇锋眰瀹屾垚鍗?55%锛? *   decode() 瀹屾垚鍗犲墿涓嬬殑 45%锛屾寜棰勬湡浣撶Н鍔犳潈銆?*娌℃湁浠讳綍鍥哄畾璁℃椂鐨勫亣杩涘害銆?*
 * - 鏄剧ず鍊煎彧浼氳拷璧剁湡瀹炲€笺€佹案涓嶈秴杩囧畠锛屽洜姝ゅ崟璋冮€掑涓斾笉浼氬€掗€€锛? *   鍛戒腑缂撳瓨鏃堕潬 RAMP_MS 闄愰€燂紝淇濊瘉 0鈫?00 涓嶆槸涓€闂€岃繃銆? * - 100% 琛ㄧず闃诲璧勬簮鐪熺殑 decode 瀹屽彲浠ユ嬁鍘绘覆鏌擄紝闅忓悗淇濈暀 HOLD_MS 鐨勫仠椤裤€? * - 璧勬簮澶辫触浼氳蛋閲嶈瘯 / fallback / 闄嶇骇涓夌骇澶勭疆锛屽苟鍦ㄧ晫闈笂缁欏嚭閲嶈瘯鍏ュ彛锛? *   鍚屾椂鏈夎嚜鍔ㄧ户缁€掕鏃讹紝涓嶄細姘歌繙鍗″湪鐧惧垎姣斾笂銆? * - onReady 浼犱簡灏辫皟鍥炶皟锛堜緵鍦烘櫙鐘舵€佹満鎺ョ嚎锛夛紝娌′紶灏遍€€鍥?setPhase('reveal')銆? */
export default function Loader({ onReady }: { onReady?: () => void }) {
  const setProgress = useStore((s) => s.setProgress)
  const setPhase = useStore((s) => s.setPhase)
  const assets = useBlockingAssets()

  const [tuning] = useState(readTuning)
  const [shown, setShown] = useState(() => tuning.frozen ?? 0)
  const [countdown, setCountdown] = useState(Math.ceil(AUTO_CONTINUE_MS / 1000))

  const assetsRef = useRef(assets)
  const onReadyRef = useRef(onReady)
  const setPhaseRef = useRef(setPhase)
  const leftRef = useRef(false)
  const fullAtRef = useRef(0)
  const loadingStartRef = useRef(performance.now())
  /** 鏄剧ず鍊煎悓鏃跺瓨涓€浠?ref锛歳AF 閲屽繀椤诲悓姝ヨ鍒板綋鍓嶅€硷紝涓嶈兘渚濊禆 setState 鏇存柊鍣?*/
  const shownRef = useRef(tuning.frozen ?? 0)

  useEffect(() => {
    assetsRef.current = assets
    onReadyRef.current = onReady
    setPhaseRef.current = setPhase
  })

  const hasError = (assets.settled && assets.failed.length > 0) || assets.retrying
  const pct = Math.round(shown)
  /** 鏄剧ず鍊艰拷骞崇湡瀹炲€笺€佽祫婧愬叏閮ㄧ粨绠椼€佷笖娌℃湁閲嶈瘯鍦ㄩ */
  const canLeave = shown >= 100 && assets.settled && !assets.retrying

  const leave = useCallback(() => {
    if (leftRef.current) return
    leftRef.current = true
    if (import.meta.env.DEV) {
      const a = assetsRef.current
      console.info(
        `[loader] 绂诲満 路 闃诲璧勬簮 ${a.readyCount}/${a.totalCount} ready` +
          `${a.failed.length ? ` 路 ${a.failed.length} 椤瑰け璐ュ凡闄嶇骇` : ''}` +
          ` 路 璧勬簮鑰楁椂 ${Math.round(a.elapsedMs)}ms` +
          ` 路 100% 鍋滈】 ${Math.round(performance.now() - fullAtRef.current)}ms`,
      )
    }
    if (onReadyRef.current) onReadyRef.current()
    else setPhaseRef.current('reveal')
  }, [])

  /* 鏄剧ず鍊艰拷璧剁湡瀹炶繘搴︼細鍙線涓婅蛋锛屼笖姘镐笉瓒呰繃鐪熷疄鍊?*/
  useEffect(() => {
    // Frozen preview keeps the loader visible for visual review.
    if (tuning.frozen !== null) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      const target = assetsRef.current.progress
      const prev = shownRef.current
      const next =
        prev >= target
          ? prev
          : tuning.ramp <= 0
            ? target
            : Math.min(target, prev + (100 / tuning.ramp) * dt)
      if (next !== prev) {
        shownRef.current = next
        setShown(next)
      }
      // 杩藉钩 100 灏卞仠甯у惊鐜紝涓嶇暀鏃犳剰涔夌殑甯搁┗ rAF
      if (next < 100) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tuning])

  /* 鍏煎鏃ф帴鍙ｏ細缁х画鎶婄櫨鍒嗘瘮鍐欒繘 store */
  useEffect(() => {
    setProgress(pct)
  }, [pct, setProgress])

  /* 100% 鍋滈】 鈫?绂诲満锛涙湁澶辫触鍒欏厛灞曠ず閿欒鎬佸苟鍊掕鏃堕檷绾х户缁?*/
  useEffect(() => {
    if (!canLeave || tuning.frozen !== null) return
    if (fullAtRef.current === 0) fullAtRef.current = performance.now()
    if (!hasError) return
    const deadline = performance.now() + AUTO_CONTINUE_MS
    const tick = window.setInterval(
      () => setCountdown(Math.max(0, Math.ceil((deadline - performance.now()) / 1000))),
      250,
    )
    const t = window.setTimeout(leave, AUTO_CONTINUE_MS)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(t)
    }
  }, [canLeave, hasError, tuning, leave])

  useEffect(() => {
    if (!canLeave || hasError || tuning.frozen !== null) return
    const remaining = Math.max(0, AUTO_CONTINUE_MS - (performance.now() - loadingStartRef.current))
    const timer = window.setTimeout(leave, remaining)
    return () => window.clearTimeout(timer)
  }, [canLeave, hasError, tuning, leave])

  return (
    <div className="loader" aria-busy={!canLeave}>
      <div className="loader__ghosts" aria-hidden />

      <h1 className="loader__word">
        <svg className="loader__wordSvg" viewBox="0 0 1200 230" role="img" aria-label="WELCOME" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="welcomeBase" width="120" height="90" patternUnits="userSpaceOnUse">
              <rect width="120" height="90" fill="#eaf8fc" />
              <polygon points="0,0 72,0 36,48" fill="#d2eef7" />
              <polygon points="72,0 120,0 120,58 36,48" fill="#bfe4f1" />
              <polygon points="0,0 36,48 0,90" fill="#f5fcfe" />
              <polygon points="36,48 120,58 120,90 0,90" fill="#c9eaf5" />
            </pattern>
            <pattern id="welcomeFill" width="120" height="90" patternUnits="userSpaceOnUse">
              <rect width="120" height="90" fill="#a9def1" />
              <polygon points="0,0 72,0 36,48" fill="#d6f2fa" />
              <polygon points="72,0 120,0 120,58 36,48" fill="#8fcfe7" />
              <polygon points="0,0 36,48 0,90" fill="#c5ebf7" />
              <polygon points="36,48 120,58 120,90 0,90" fill="#9bd8ec" />
            </pattern>
            <clipPath id="welcomeProgressClip">
              <rect x="0" y={230 * (1 - shown / 100)} width="1200" height={230 * (shown / 100)} />
            </clipPath>
          </defs>
          <text className="loader__wordSvgBase" x="600" y="176" textAnchor="middle">WELCOME</text>
          <text className="loader__wordSvgFill" x="600" y="176" textAnchor="middle" clipPath="url(#welcomeProgressClip)">WELCOME</text>
        </svg>
      </h1>

      <div className="loader__pct" role="progressbar" aria-label="首屏资源加载" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className="loader__num">{pct}</span>
        <span className="loader__sign">%</span>
      </div>

      <div className="loader__sig">
        <i />
        ISABELLA PORTFOLIO WEBSITE
      </div>

      {hasError && (
        <div className="loader__err" role="alert">
          <p className="loader__errTitle">{assets.retrying ? '正在重试…' : `${assets.failed.length} 项首屏资源加载失败`}</p>
          {import.meta.env.DEV && <ul className="loader__errList">{assets.failed.map((rt) => <li key={rt.entry.id}>{rt.entry.url} — {rt.error}</li>)}</ul>}
          <div className="loader__errActions">
            <button type="button" onClick={retryFailedAssets} disabled={assets.retrying}>重试</button>
            <button type="button" onClick={leave}>以降级模式继续{assets.retrying ? '' : `（${countdown}s）`}</button>
          </div>
        </div>
      )}
    </div>
  )
}
