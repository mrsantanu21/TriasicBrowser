/**
 * SessionRestore — saves and restores the URLs of open (non-incognito) windows
 * across app restarts.
 *
 * Session is saved on app 'before-quit' and loaded on 'whenReady'.
 * Incognito windows are deliberately excluded (private by design).
 */
import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { TabWindowSnapshot } from '../../shared/types'

const SESSION_PATH = join(app.getPath('userData'), 'session.json')

interface SavedWindow {
  url: string
  title: string
  tabState?: TabWindowSnapshot
}

interface SessionData {
  windows: SavedWindow[]
  savedAt: number
}

/**
 * Persist the given window list.
 * Filters out about:blank, file: and chrome: URLs (internal, not restorable).
 */
export function saveSession(windows: SavedWindow[]): void {
  const isRestorable = (url: string): boolean => Boolean(url) && !/^(about:|file:|chrome:)/i.test(url)
  const valid = windows.flatMap((window) => {
    if (!window.tabState) return isRestorable(window.url) ? [window] : []
    const tabs = window.tabState.tabs.filter((tab) => isRestorable(tab.url))
    if (!tabs.length) return []
    const activeTabId = tabs.some((tab) => tab.id === window.tabState!.activeTabId)
      ? window.tabState.activeTabId
      : tabs[0].id
    return [{ ...window, url: tabs.find((tab) => tab.id === activeTabId)!.url, tabState: { ...window.tabState, tabs, activeTabId } }]
  })

  try {
    writeFileSync(
      SESSION_PATH,
      JSON.stringify({ windows: valid, savedAt: Date.now() } satisfies SessionData, null, 2),
    )
  } catch (err) {
    console.error('[SessionRestore] Failed to save session:', err)
  }
}

/**
 * Load the last saved session.
 * Returns null if no session exists or the session is empty.
 */
export function loadSession(): SavedWindow[] | null {
  if (!existsSync(SESSION_PATH)) return null
  try {
    const data = JSON.parse(readFileSync(SESSION_PATH, 'utf8')) as SessionData
    // Older releases stored one {url,title} per window. Keep those records
    // readable and treat each as a one-tab window.
    const windows = Array.isArray(data.windows) ? data.windows : []
    return windows.length > 0 ? windows : null
  } catch {
    return null
  }
}
