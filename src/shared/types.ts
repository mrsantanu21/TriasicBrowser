// ─── Shared types between main process and renderer ───────────────────────────

export interface PageState {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

export interface Tab {
  id: string
  url: string
  title: string
  favicon: string | null
  isLoading: boolean
  isPinned: boolean
  isActive: boolean
}

export interface BrowserSettings {
  homepageUrl: string
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'brave' | 'custom'
  searchEngineUrl?: string
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  showBookmarksBar: boolean
  blockAds: boolean
  restoreOnLaunch: boolean
}

// ─── Phase 4: Privacy & Power Features ────────────────────────────────────────

export type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted'

export interface DownloadItem {
  id: string
  filename: string
  url: string
  savePath: string
  totalBytes: number
  receivedBytes: number
  state: DownloadState
  speed: number        // bytes/s while progressing
  startedAt: number    // Date.now() timestamp
}

export interface AdblockStats {
  isEnabled: boolean
  blockedCount: number
}

export interface WindowInfo {
  isIncognito: boolean
}

// ─── Phase 5: Advanced Features ────────────────────────────────────────────────

/**
 * A saved credential entry.  The password field is NEVER present in this type —
 * it stays encrypted in the main process.  Use bridge.getPassword(id) to reveal.
 */
export interface Credential {
  id: string
  origin: string    // e.g. "github.com"
  username: string
  createdAt: number
  updatedAt: number
}

/**
 * Emitted by the main process when a page load matches a saved credential.
 * The password is intentionally absent — main injects it on fill, never sends to renderer.
 */
export interface AutofillState {
  origin: string
  credentialId: string
  username: string
}

export interface ExtensionInfo {
  id: string
  name: string
  version: string
  path: string
}
