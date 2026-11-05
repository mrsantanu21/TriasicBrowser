/**
 * AdblockEngine — wraps @ghostery/adblocker-electron.
 *
 * Loads EasyList + EasyPrivacy filter lists on first run (network fetch,
 * ~500 KB).  Hooks into session.defaultSession via session.webRequest to
 * cancel blocked requests at the network layer — no page-side injection.
 *
 * Note: cosmetic filters (CSS-based ad hiding) are disabled because they
 * require session.registerPreloadScript which is Electron 32+.
 * Network-level blocking (cancelling ad/tracker requests) still works fully.
 *
 * Emits stats changes to registered listeners so index.ts can push them
 * to all renderer windows.
 */
import { session } from 'electron'
import { ElectronBlocker } from '@ghostery/adblocker-electron'
import type { AdblockStats } from '../../shared/types'

// ─── State ────────────────────────────────────────────────────────────────────
let blocker: ElectronBlocker | null = null
let blockedCount = 0
let isEnabled = true

type StatsListener = (stats: AdblockStats) => void
const listeners = new Set<StatsListener>()

// ─── Internal helpers ─────────────────────────────────────────────────────────
function notify(): void {
  const stats = getStats()
  for (const cb of listeners) cb(stats)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStats(): AdblockStats {
  return { isEnabled, blockedCount }
}

/**
 * Register a callback that fires whenever isEnabled or blockedCount changes.
 * Returns an unsubscribe function.
 */
export function onStatsChange(cb: StatsListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Download and compile filter lists, then enable blocking on the default
 * session.  Safe to call once at startup; awaiting is optional (runs async).
 *
 * We use `fromLists` directly (instead of `fromPrebuiltAdsAndTracking`) so we
 * can pass `{ loadCosmeticFilters: false }` — disabling CSS injection that
 * requires session.registerPreloadScript (Electron 32+).
 * Network-level blocking (EasyList + EasyPrivacy request cancellation) works fully.
 */
export async function initAdblock(): Promise<void> {
  try {
    // Node 20 (Electron 31) ships global fetch — no polyfill needed.
    // Import list URLs from the base adblocker package.
    const { adsAndTrackingLists } = await import('@ghostery/adblocker')

    blocker = await ElectronBlocker.fromLists(
      fetch,
      adsAndTrackingLists,
      // Config: disable cosmetic filters (Electron 32+ feature)
      { loadCosmeticFilters: false },
    )

    // Count every blocked request for the adblock badge
    blocker.on('request-blocked', () => {
      blockedCount++
      notify()
    })

    if (isEnabled) {
      blocker.enableBlockingInSession(session.defaultSession)
    }

    console.log('[AdblockEngine] Initialized — network blocking enabled')
  } catch (err) {
    console.error('[AdblockEngine] Failed to initialize:', err)
  }
}

/** Toggle blocking on/off without re-downloading filter lists. */
export function setAdblockEnabled(enabled: boolean): void {
  isEnabled = enabled
  if (!blocker) return

  if (enabled) {
    blocker.enableBlockingInSession(session.defaultSession)
  } else {
    blocker.disableBlockingInSession(session.defaultSession)
  }
  notify()
}
