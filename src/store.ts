import { create } from 'zustand'
import {
  INITIAL_CONTEXT,
  isSceneVisible,
  reduce,
  type Capabilities,
  type OverlaySource,
  type SceneContext,
  type SceneEvent,
  type SceneState,
  CAPABILITIES,
} from './experience/experienceMachine'

/** 涓诲満鏅箣涓婂彔鍔犵殑妯℃€佸眰 */
export type Overlay = null | 'about' | 'skills' | 'work' | 'contact'

/** SELECTED WORK 鍐呴儴鐨勫瓙瑙嗗浘 */
export type WorkView = null | 'design' | 'photograph' | 'video' | 'website' | 'photo-coner'

/**
 * 鏃х殑涓夋寮忛樁娈点€? *
 * 宸茬粡涓嶅啀鏄簨瀹炴潵婧愪簡 鈥斺€?鐪熸鐨勭姸鎬佸湪 `scene`锛堣 experienceMachine锛夈€? * 杩欓噷淇濈暀鎴愭淳鐢熷€硷紝鍙负璁?Loader / Reveal / App 杩欎簺杩樻病杩佺Щ鐨勬ā鍧楃户缁伐浣溿€? * 鏂颁唬鐮佽璇?`scene.state`锛屼笉瑕佽 `phase`銆? */
export type Phase = 'loading' | 'reveal' | 'scene'

function phaseOf(state: SceneState): Phase {
  if (!isSceneVisible(state)) return 'loading'
  return state === 'reveal' ? 'reveal' : 'scene'
}

type State = {
  /** 鍦烘櫙鐘舵€佹満鐨勫畬鏁?context */
  scene: SceneContext
  /** 娲剧敓鑷?scene.state 鐨勬棫闃舵鍊硷紝瑙佷笂闈㈢殑璇存槑 */
  phase: Phase
  progress: number
  overlay: Overlay
  workView: WorkView

  /** 寰€鐘舵€佹満鎶曚竴涓簨浠讹紱杩欐槸鎺ㄨ繘鍦烘櫙鐨?*鍞竴**鏂瑰紡 */
  send: (e: SceneEvent) => void
  /** 鍛婅瘔鐘舵€佹満鐢ㄦ埛鐨?Reduced Motion 鍋忓ソ */
  setReducedMotion: (reduced: boolean) => void
  /** 鍏煎鏃ф帴鍙ｏ細鍐呴儴缈昏瘧鎴愬搴旂殑鐘舵€佹満浜嬩欢 */
  setPhase: (p: Phase) => void
  setProgress: (n: number) => void
  openOverlay: (o: Overlay, source?: OverlaySource) => void
  closeOverlay: () => void
  setWorkView: (v: WorkView) => void
}

export const useStore = create<State>((set, get) => ({
  scene: INITIAL_CONTEXT,
  phase: phaseOf(INITIAL_CONTEXT.state),
  progress: 0,
  overlay: null,
  workView: null,

  /**
   * 寰€鐘舵€佹満鎶曚簨浠讹紝骞舵妸銆屾诞灞備粈涔堟椂鍊欑湡姝ｆ寕涓?/ 鍗告帀銆嶈窡鐫€鐘舵€佽蛋銆?   *
   * 椤哄簭鏄細闀滃ご鍏堝埌浣?鈫?娴眰鍐嶆寕杞?鈫?杩涘叆鍔ㄧ敾鎾畬鎵嶄氦鐒︾偣銆?   * 鎵€浠ヤ粠鏌滃唴鐑偣杩涘叆鏃?`openOverlay` 鍙姇 REQUEST_OVERLAY锛堢姸鎬佹満杩?focusing锛夛紝
   * 鐪熸鎶?`overlay` 鍐欒繘 store 鏄湪鏀跺埌 FOCUS_DONE銆佺姸鎬佸彉鎴?overlayOpening 涔嬪悗 鈥斺€?   * 涔熷氨鏄繖閲屻€傞《閮ㄥ鑸繘鍏ヤ笉闇€瑕佸眬閮ㄦ帹杩戯紝REQUEST_OVERLAY 鐩存帴钀藉埌
   * overlayOpening锛屽悓涓€娈典唬鐮佸悓涓€甯у氨鎶婃诞灞傛寕涓娿€?   */
  send: (event) =>
    set((s) => {
      const next = reduce(s.scene, event)
      if (next === s.scene) return s
      const patch: Partial<State> = { scene: next, phase: phaseOf(next.state) }
      const mounting = next.state === 'overlayOpening' || next.state === 'overlayOpen'
      if (mounting && s.overlay !== next.overlay) {
        patch.overlay = next.overlay
        patch.workView = null
      }
      if (!mounting && next.overlay === null && s.overlay !== null) {
        patch.overlay = null
        patch.workView = null
      }
      return patch
    }),

  setReducedMotion: (reduced) =>
    set((s) => (s.scene.reduced === reduced ? s : { scene: { ...s.scene, reduced } })),

  // Compatibility layer: advance legacy phases through the state machine
  setPhase: (p) => {
    const { send } = get()
    if (p === 'reveal') {
      send({ type: 'ASSETS_READY' })
      return
    }
    if (p !== 'scene') return
    // 寮€鍙戞湡鐩磋揪锛?v=about锛変細浠?loading 涓€姝ヨ烦鍒?scene
    send({ type: 'ASSETS_READY' })
    send({ type: 'REVEAL_DONE' })
    if (get().scene.state === 'approach') send({ type: 'SKIP_INTRO' })
  },

  setProgress: (progress) => set({ progress }),

  openOverlay: (overlay, source = 'nav') => {
    if (!overlay) {
      get().closeOverlay()
      return
    }
    get().send({ type: 'REQUEST_OVERLAY', overlay, source })
    // 椤堕儴瀵艰埅杩涘叆鏃朵笂闈㈣繖涓€鍙戝凡缁忚惤鍒?overlayOpening 骞舵寕濂芥诞灞傦紝
    // 杩欓噷琛ヤ竴鍙?OVERLAY_ENTERED 璁╃姸鎬佹帹杩涘埌 overlayOpen锛?    // 鐑偣杩涘叆杩樺仠鍦?focusing锛岃绛夐暅澶村埌浣嶏紝杩欎竴鍙戜細琚姸鎬佹満蹇界暐銆?    get().send({ type: 'OVERLAY_ENTERED' })
  },

  /**
   * 鍏抽棴娴眰銆?   *
   * 閫€鍑哄姩鐢荤敱 OverlayHost 鑷繁绠″埌搴曪紙瀹冩挱瀹屾墠鍗歌浇锛?绗?1鈥? 姝ワ級锛?   * 鐘舵€佹満杩欒竟鐨?`overlayClosing` 鍙敤鏉ユ尅浣忓満鏅緭鍏ャ€侽verlayHost 鐩墠
   * 涓嶅洖鎶ュ姩鐢婚樁娈碉紝鎵€浠ヨ繖閲岃姹傚叧闂殑鍚屾椂灏辨妸 OVERLAY_EXITED 琛ヤ笂锛?   * 鍚﹀垯鐘舵€佹満浼氭案杩滃仠鍦?overlayClosing 鈥斺€?閭ｄ釜鐘舵€侀噷鐑偣鍜屽鑸兘鏄叧鐨勶紝
   * 鍦烘櫙绛変簬姝绘帀銆傜瓑 OverlayHost 鑳藉洖鎶ラ樁娈垫椂鎶婅繖涓€鍙戞尓杩囧幓銆?   */
  closeOverlay: () => {
    get().send({ type: 'CLOSE_OVERLAY' })
    get().send({ type: 'OVERLAY_EXITED' })
  },

  setWorkView: (workView) => set({ workView }),
}))

/** 褰撳墠鐘舵€佸厑璁稿摢浜涜緭鍏ワ細鐘舵€佹満閭ｅ紶杈撳叆瑙勫垯琛ㄧ殑璇诲彇鍏ュ彛銆? *  娉ㄦ剰鍒拰 components/fallback/capabilities.ts 鐨勮澶囪兘鍔涙帰娴嬫贩娣嗐€?*/
export function useSceneCapabilities(): Capabilities {
  return useStore((s) => CAPABILITIES[s.scene.state])
}

/** 缁勪欢閲岃鍦烘櫙鐘舵€佺殑鎺ㄨ崘鍏ュ彛 */
export function useSceneState(): SceneState {
  return useStore((s) => s.scene.state)
}

