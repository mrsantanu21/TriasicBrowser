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

const SESSION_PATH = join(app.getPath('userData'), 'session.json')

interface SavedWindow {
  url: string
  title: string
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
  const valid = windows.filter(
    (w) =>
      w.url &&
      !w.url.startsWith('about:') &&
      !w.url.startsWith('file:') &&
      !w.url.startsWith('chrome:'),
  )

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
    return data.windows.length > 0 ? data.windows : null
  } catch {
    return null
  }
}
