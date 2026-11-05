/**
 * Electron Main Process entry point.
 *
 * Architecture:
 *  - WindowManager      → creates/tracks BrowserWindow + WebContentsView pairs
 *  - DownloadManager    → hooks session.on('will-download'), pushes live progress
 *  - AdblockEngine      → @ghostery/adblocker-electron, network-level blocking
 *  - ScreenshotManager  → webContents.capturePage() → ~/Pictures/TriasicBrowser
 *  - PasswordStore      → safeStorage-encrypted credentials in userData JSON
 *  - AutofillManager    → per-window autofill detection + executeJavaScript fill
 *  - SessionRestore     → save/load window URLs across restarts
 *  - ExtensionManager   → session.loadExtension() + persistence
 *
 * ALL ipcMain handlers are registered once here.
 * Each handler calls getContextFromSender(event.sender) to look up the correct
 * WebContentsView for the window that fired the event.
 */
import { app, ipcMain, BrowserWindow, session, dialog } from 'electron'
import { createWindow, getContextFromSender, getContext } from './windows/WindowManager'
import {
  hookSession,
  openDownload,
  showDownloadInFolder,
  cancelDownload,
  clearCompletedDownloads,
  getAllDownloads,
} from './downloads/DownloadManager'
import {
  initAdblock,
  setAdblockEnabled,
  getStats as getAdblockStats,
  onStatsChange,
} from './privacy/AdblockEngine'
import { captureScreenshot } from './screenshot/ScreenshotManager'
import {
  saveCredential,
  getByOrigin,
  listAll as listAllCredentials,
  getPassword,
  deleteById as deleteCredential,
} from './passwords/PasswordStore'
import { setupAutofillForContext, performAutofill } from './passwords/AutofillManager'
import { saveSession, loadSession } from './session/SessionRestore'
import {
  loadExtension,
  getLoadedExtensions,
  removeExtension,
  reloadPersistedExtensions,
} from './extensions/ExtensionManager'
import { resolveUrl } from './windows/WindowManager'
import { initAutoUpdater, checkForUpdates, installUpdate } from './updater/AutoUpdater'
import { getSettings, updateSettings } from './settings/SettingsStore'
import log from './logger'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function broadcastAdblockStats(): void {
  const stats = getAdblockStats()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('adblock:stats', stats)
  }
}

/** Spin up a new window, hook its session for downloads, and enable autofill. */
function spawnWindow(options: { incognito?: boolean; initialUrl?: string } = {}): BrowserWindow {
  const win = createWindow(options)
  const ctx = getContext(win.id)
  if (ctx) {
    hookSession(ctx.pageSession)
    setupAutofillForContext(ctx)  // no-op for incognito
  }
  return win
}

// ─── IPC: Window controls ─────────────────────────────────────────────────────
ipcMain.on('window:minimize', (event) => {
  getContextFromSender(event.sender)?.win.minimize()
})
ipcMain.on('window:maximize', (event) => {
  const ctx = getContextFromSender(event.sender)
  if (!ctx) return
  ctx.win.isMaximized() ? ctx.win.unmaximize() : ctx.win.maximize()
})
ipcMain.on('window:close', (event) => {
  getContextFromSender(event.sender)?.win.close()
})
ipcMain.handle('window:getInfo', (event) => {
  const ctx = getContextFromSender(event.sender)
  return { isIncognito: ctx?.isIncognito ?? false }
})
ipcMain.on('window:openIncognito', () => {
  try {
    log.info('[Main] Opening incognito window...')
    spawnWindow({ incognito: true })
  } catch (err) {
    log.error('[Main] Failed to open incognito window:', err)
  }
})
ipcMain.on('window:openNew', () => spawnWindow())

// ─── IPC: Navigation ──────────────────────────────────────────────────────────
ipcMain.on('navigate', (event, rawInput: string) => {
  const ctx = getContextFromSender(event.sender)
  if (!ctx) return
  ctx.pageView.webContents.loadURL(resolveUrl(rawInput))
})
ipcMain.on('navigate:back', (event) => {
  const ctx = getContextFromSender(event.sender)
  if (ctx?.pageView.webContents.canGoBack()) ctx.pageView.webContents.goBack()
})
ipcMain.on('navigate:forward', (event) => {
  const ctx = getContextFromSender(event.sender)
  if (ctx?.pageView.webContents.canGoForward()) ctx.pageView.webContents.goForward()
})
ipcMain.on('navigate:reload', (event) => {
  getContextFromSender(event.sender)?.pageView.webContents.reload()
})
ipcMain.on('navigate:stop', (event) => {
  getContextFromSender(event.sender)?.pageView.webContents.stop()
})

// ─── IPC: Ad Blocker ──────────────────────────────────────────────────────────
ipcMain.on('adblock:setEnabled', (_event, enabled: boolean) => {
  setAdblockEnabled(enabled)
  broadcastAdblockStats()
})
ipcMain.handle('adblock:getStats', () => getAdblockStats())

// ─── IPC: Downloads ───────────────────────────────────────────────────────────
ipcMain.on('download:open', (_event, id: string) => openDownload(id))
ipcMain.on('download:showInFolder', (_event, id: string) => showDownloadInFolder(id))
ipcMain.on('download:cancel', (_event, id: string) => cancelDownload(id))
ipcMain.on('download:clearCompleted', (event) => {
  clearCompletedDownloads()
  const ctx = getContextFromSender(event.sender)
  if (ctx && !ctx.win.isDestroyed()) {
    ctx.win.webContents.send('downloads:update', getAllDownloads())
  }
})
ipcMain.handle('download:getAll', () => getAllDownloads())

// ─── IPC: Screenshot ──────────────────────────────────────────────────────────
ipcMain.handle('screenshot:capture', async (event) => {
  const ctx = getContextFromSender(event.sender)
  if (!ctx) return null
  try {
    return await captureScreenshot(ctx)
  } catch (err) {
    log.error('[Screenshot] Failed:', err)
    return null
  }
})

// ─── IPC: Passwords ───────────────────────────────────────────────────────────
ipcMain.handle(
  'password:save',
  (_event, origin: string, username: string, password: string) => {
    try {
      return saveCredential(origin, username, password)
    } catch (err) {
      log.error('[PasswordStore] Save failed:', err)
      return null
    }
  },
)
ipcMain.handle('password:getByOrigin', (_event, origin: string) => getByOrigin(origin))
ipcMain.handle('password:listAll', () => listAllCredentials())
ipcMain.handle('password:delete', (_event, id: string) => deleteCredential(id))
ipcMain.handle('password:reveal', (_event, id: string) => getPassword(id))

/** Autofill: injects credentials into the active page, never returns the password. */
ipcMain.handle('autofill:fill', async (event, credentialId: string) => {
  const ctx = getContextFromSender(event.sender)
  if (!ctx) return false
  return performAutofill(ctx, credentialId)
})

// ─── IPC: Settings ────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => getSettings())
ipcMain.handle('settings:update', (_event, partial) => updateSettings(partial))

// ─── IPC: Extensions ──────────────────────────────────────────────────────────
ipcMain.handle('extension:load', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win ?? BrowserWindow.getFocusedWindow() ?? undefined!, {
    title: 'Load Unpacked Extension',
    properties: ['openDirectory'],
    buttonLabel: 'Load Extension',
  })
  if (result.canceled || result.filePaths.length === 0) return null
  try {
    return await loadExtension(result.filePaths[0])
  } catch (err) {
    log.error('[ExtensionManager] Load failed:', err)
    return null
  }
})
ipcMain.handle('extension:list', () => getLoadedExtensions())
ipcMain.handle('extension:remove', async (_event, id: string) => removeExtension(id))

// ─── IPC: Auto Updater ────────────────────────────────────────────────────────
ipcMain.on('updater:check', () => checkForUpdates())
ipcMain.on('updater:install', () => installUpdate())

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  log.info('[TriasicBrowser] Starting application...')
  initAutoUpdater()

  // Load last session (if any)
  const savedSession = loadSession()
  const firstUrl = savedSession?.[0]?.url

  // Create the primary window with restored URL (or google.com)
  spawnWindow({ initialUrl: firstUrl })

  // Restore additional windows from last session
  if (savedSession && savedSession.length > 1) {
    for (const { url } of savedSession.slice(1)) {
      spawnWindow({ initialUrl: url })
    }
  }

  // Hook default session downloads (incognito sessions hooked in spawnWindow above)
  hookSession(session.defaultSession)

  // Reload persisted extensions
  reloadPersistedExtensions().catch((err) => log.error('[Main] Extension reload error:', err))

  // Initialise ad blocker async — app is already visible and usable
  initAdblock()
    .then(() => {
      broadcastAdblockStats()
      onStatsChange(broadcastAdblockStats)
    })
    .catch((err) => log.error('[Main] Adblock init failed:', err))

  // Check for updates in production build after startup
  if (app.isPackaged) {
    checkForUpdates()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) spawnWindow()
  })
})

// Save session on quit (skips incognito windows)
app.on('before-quit', () => {
  log.info('[TriasicBrowser] App quitting, saving session...')
  const windows: { url: string; title: string }[] = []
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    const ctx = getContext(win.id)
    if (!ctx || ctx.isIncognito) continue
    const url = ctx.pageView.webContents.getURL()
    const title = ctx.pageView.webContents.getTitle()
    windows.push({ url, title })
  }
  saveSession(windows)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

