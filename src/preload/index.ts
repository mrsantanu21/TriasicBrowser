/**
 * Preload Script — isolated bridge between main and renderer.
 *
 * RULE: Only expose typed functions here. Never expose ipcRenderer, require,
 * or any Node API directly — contextBridge enforces the isolation boundary.
 *
 * Phase 4 additions: incognito, adblock, downloads, screenshot
 * Phase 5 additions: passwords, autofill, extensions, window:openNew
 */
import { contextBridge, ipcRenderer } from 'electron'
import type {
  PageState,
  DownloadItem,
  AdblockStats,
  WindowInfo,
  Credential,
  AutofillState,
  ExtensionInfo,
  BrowserSettings,
  Tab,
  TabSnapshot,
  TabWindowSnapshot,
} from '../shared/types'

// ─── Typed Bridge API ─────────────────────────────────────────────────────────
export type TriasicBridge = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  navigate: (url: string) => void
  goBack: () => void
  goForward: () => void
  reload: () => void
  stop: () => void

  // ── Window controls ──────────────────────────────────────────────────────────
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void

  // ── Incognito / multi-window ─────────────────────────────────────────────────
  getWindowInfo: () => Promise<WindowInfo>
  openIncognitoWindow: () => void
  openNewWindow: () => void

  // ── Ad Blocker ───────────────────────────────────────────────────────────────
  setAdblockEnabled: (enabled: boolean) => void
  getAdblockStats: () => Promise<AdblockStats>
  onAdblockStats: (callback: (stats: AdblockStats) => void) => () => void

  // ── Downloads ────────────────────────────────────────────────────────────────
  onDownloadsUpdate: (callback: (items: DownloadItem[]) => void) => () => void
  getAllDownloads: () => Promise<DownloadItem[]>
  openDownload: (id: string) => void
  showDownloadInFolder: (id: string) => void
  cancelDownload: (id: string) => void
  clearCompletedDownloads: () => void

  // ── Screenshot ───────────────────────────────────────────────────────────────
  captureScreenshot: () => Promise<string | null>

  // ── Passwords ────────────────────────────────────────────────────────────────
  /** Save (or update) a credential for the given origin. */
  saveCredential: (origin: string, username: string, password: string) => Promise<Credential | null>
  /** Get credential stubs (no password) for an origin hostname. */
  getCredentialsByOrigin: (origin: string) => Promise<Array<{ id: string; username: string }>>
  /** List all saved credentials — no passwords. */
  listAllCredentials: () => Promise<Credential[]>
  /** Delete a single credential by id. */
  deleteCredential: (id: string) => Promise<void>
  /**
   * Reveal the decrypted password for a single credential.
   * Only call from the password manager UI when the user explicitly requests it.
   */
  revealPassword: (id: string) => Promise<string | null>

  // ── Autofill ─────────────────────────────────────────────────────────────────
  /** Subscribe to autofill opportunities (emitted by main after did-navigate). */
  onAutofillAvailable: (callback: (state: AutofillState) => void) => () => void
  /** Trigger autofill injection for the given credential. */
  fillAutofill: (credentialId: string) => Promise<boolean>

  // ── Extensions ───────────────────────────────────────────────────────────────
  /** Open a folder picker and load the chosen unpacked extension. */
  loadExtension: () => Promise<ExtensionInfo | null>
  /** List all currently loaded extensions. */
  listExtensions: () => Promise<ExtensionInfo[]>
  /** Unload and forget an extension by its Electron ID. */
  removeExtension: (id: string) => Promise<void>

  // ── Auto Updater ─────────────────────────────────────────────────────────────
  checkForUpdates: () => void
  installUpdate: () => void
  onUpdateStatus: (callback: (status: { event: string; data: any }) => void) => () => void

  // ── Settings ─────────────────────────────────────────────────────────────────
  getSettings: () => Promise<BrowserSettings>
  updateSettings: (partial: Partial<BrowserSettings>) => Promise<BrowserSettings>

  // ── Page state ───────────────────────────────────────────────────────────────
  onPageUpdate: (callback: (state: PageState) => void) => () => void
  getTabs: () => Promise<Tab[]>
  onTabsUpdate: (callback: (tabs: Tab[]) => void) => () => void
  newTab: () => void
  activateTab: (id: string) => void
  closeTab: (id: string) => void
  pinTab: (id: string) => void
  groupTab: (id: string, title: string) => void
  reorderTabs: (ids: string[]) => void
  getRecentlyClosedTabs: () => Promise<TabSnapshot[]>
  restoreClosedTab: (id?: string) => void
  setVerticalTabs: (enabled: boolean) => void
  onTabLayout: (callback: (vertical: boolean) => void) => () => void
  getRecentlyClosedWindows: () => Promise<TabWindowSnapshot[]>
  restoreClosedWindow: (activeTabId?: string) => void
}

export type SantaBridge = TriasicBridge

const bridgeApi = {
  // Navigation
  navigate: (url: string) => ipcRenderer.send('navigate', url),
  goBack: () => ipcRenderer.send('navigate:back'),
  goForward: () => ipcRenderer.send('navigate:forward'),
  reload: () => ipcRenderer.send('navigate:reload'),
  stop: () => ipcRenderer.send('navigate:stop'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Incognito / multi-window
  getWindowInfo: () => ipcRenderer.invoke('window:getInfo'),
  openIncognitoWindow: () => ipcRenderer.send('window:openIncognito'),
  openNewWindow: () => ipcRenderer.send('window:openNew'),

  // Ad Blocker
  setAdblockEnabled: (enabled: boolean) =>
    ipcRenderer.send('adblock:setEnabled', enabled),
  getAdblockStats: () => ipcRenderer.invoke('adblock:getStats'),
  onAdblockStats: (cb: (stats: AdblockStats) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, stats: AdblockStats) => cb(stats)
    ipcRenderer.on('adblock:stats', listener)
    return () => ipcRenderer.removeListener('adblock:stats', listener)
  },

  // Downloads
  onDownloadsUpdate: (cb: (items: DownloadItem[]) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, items: DownloadItem[]) => cb(items)
    ipcRenderer.on('downloads:update', listener)
    return () => ipcRenderer.removeListener('downloads:update', listener)
  },
  getAllDownloads: () => ipcRenderer.invoke('download:getAll'),
  openDownload: (id: string) => ipcRenderer.send('download:open', id),
  showDownloadInFolder: (id: string) => ipcRenderer.send('download:showInFolder', id),
  cancelDownload: (id: string) => ipcRenderer.send('download:cancel', id),
  clearCompletedDownloads: () => ipcRenderer.send('download:clearCompleted'),

  // Screenshot
  captureScreenshot: () => ipcRenderer.invoke('screenshot:capture'),

  // Passwords
  saveCredential: (origin: string, username: string, password: string) =>
    ipcRenderer.invoke('password:save', origin, username, password),
  getCredentialsByOrigin: (origin: string) =>
    ipcRenderer.invoke('password:getByOrigin', origin),
  listAllCredentials: () => ipcRenderer.invoke('password:listAll'),
  deleteCredential: (id: string) => ipcRenderer.invoke('password:delete', id),
  revealPassword: (id: string) => ipcRenderer.invoke('password:reveal', id),

  // Autofill
  onAutofillAvailable: (cb: (state: AutofillState) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, state: AutofillState) => cb(state)
    ipcRenderer.on('autofill:available', listener)
    return () => ipcRenderer.removeListener('autofill:available', listener)
  },
  fillAutofill: (credentialId: string) =>
    ipcRenderer.invoke('autofill:fill', credentialId),

  // Extensions
  loadExtension: () => ipcRenderer.invoke('extension:load'),
  listExtensions: () => ipcRenderer.invoke('extension:list'),
  removeExtension: (id: string) => ipcRenderer.invoke('extension:remove', id),

  // Auto Updater
  checkForUpdates: () => ipcRenderer.send('updater:check'),
  installUpdate: () => ipcRenderer.send('updater:install'),
  onUpdateStatus: (cb: (status: { event: string; data: any }) => void): (() => void) => {
    const events = [
      'update-available',
      'update-not-available',
      'update-error',
      'update-download-progress',
      'update-downloaded',
    ]
    const listeners = events.map((event) => {
      const handler = (_e: Electron.IpcRendererEvent, data: any) => cb({ event, data })
      ipcRenderer.on(`updater:${event}`, handler)
      return { event, handler }
    })
    return () => {
      listeners.forEach(({ event, handler }) =>
        ipcRenderer.removeListener(`updater:${event}`, handler),
      )
    }
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial: Partial<BrowserSettings>) => ipcRenderer.invoke('settings:update', partial),

  // Page state subscription
  onPageUpdate: (cb: (state: PageState) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, state: PageState) => cb(state)
    ipcRenderer.on('page:update', listener)
    return () => ipcRenderer.removeListener('page:update', listener)
  },
  getTabs: () => ipcRenderer.invoke('tabs:get'),
  onTabsUpdate: (cb: (tabs: Tab[]) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, tabs: Tab[]) => cb(tabs)
    ipcRenderer.on('tabs:update', listener)
    return () => ipcRenderer.removeListener('tabs:update', listener)
  },
  newTab: () => ipcRenderer.send('tabs:new'),
  activateTab: (id: string) => ipcRenderer.send('tabs:activate', id),
  closeTab: (id: string) => ipcRenderer.send('tabs:close', id),
  pinTab: (id: string) => ipcRenderer.send('tabs:pin', id),
  groupTab: (id: string, title: string) => ipcRenderer.send('tabs:group', id, title),
  reorderTabs: (ids: string[]) => ipcRenderer.send('tabs:reorder', ids),
  getRecentlyClosedTabs: () => ipcRenderer.invoke('tabs:recentlyClosed'),
  restoreClosedTab: (id?: string) => ipcRenderer.send('tabs:restoreClosed', id),
  setVerticalTabs: (enabled: boolean) => ipcRenderer.send('tabs:vertical', enabled),
  onTabLayout: (cb: (vertical: boolean) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, vertical: boolean) => cb(vertical)
    ipcRenderer.on('tabs:layout', listener)
    return () => ipcRenderer.removeListener('tabs:layout', listener)
  },
  getRecentlyClosedWindows: () => ipcRenderer.invoke('windows:recentlyClosed'),
  restoreClosedWindow: (activeTabId?: string) => ipcRenderer.send('windows:restoreClosed', activeTabId),
} satisfies TriasicBridge

// ─── Expose to renderer via window.triasicBridge & window.santaBridge ─────────
contextBridge.exposeInMainWorld('triasicBridge', bridgeApi)
contextBridge.exposeInMainWorld('santaBridge', bridgeApi)
