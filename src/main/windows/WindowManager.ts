/**
 * WindowManager — creates and tracks every BrowserWindow and its associated
 * WebContentsView.  All IPC handlers in index.ts call getContextFromSender()
 * to find the correct pageView/session for the window that fired the event,
 * which is the foundation for both multi-window and incognito support.
 */
import {
  BrowserWindow,
  WebContentsView,
  session,
  shell,
  app,
  type Session,
} from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PageState } from '../../shared/types'

const isDev = !app.isPackaged

/** Pixels reserved for the React chrome UI (titlebar + toolbar) */
export const TOOLBAR_HEIGHT = 72

// ─── Context record ───────────────────────────────────────────────────────────
export interface WindowContext {
  win: BrowserWindow
  pageView: WebContentsView
  isIncognito: boolean
  /** The Electron Session used by pageView — may be non-persistent for incognito */
  pageSession: Session
}

const windowMap = new Map<number, WindowContext>()

import { getSettings, getSearchUrlTemplate } from '../settings/SettingsStore'

// ─── URL resolver (shared utility) ────────────────────────────────────────────
export function resolveUrl(input: string): string {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/.test(trimmed)) return `https://${trimmed}`
  const settings = getSettings()
  const template = getSearchUrlTemplate(settings.searchEngine)
  return template.replace('%s', encodeURIComponent(trimmed))
}

// ─── Window factory ───────────────────────────────────────────────────────────
export function createWindow(options: { incognito?: boolean; initialUrl?: string } = {}): BrowserWindow {
  const isIncognito = options.incognito ?? false

  // Non-persistent partition for incognito — no 'persist:' prefix = memory only
  const pageSession: Session = isIncognito
    ? session.fromPartition(`incognito-${randomUUID()}`, { cache: false })
    : session.defaultSession

  const win = new BrowserWindow({
    title: isIncognito ? 'Triasic Browser - Incognito' : 'Triasic Browser',
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: isIncognito ? '#0d0a14' : '#0a0a0a',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const pageView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: pageSession,
    },
  })

  windowMap.set(win.id, { win, pageView, isIncognito, pageSession })
  win.contentView.addChildView(pageView)

  // ── Bounds management ───────────────────────────────────────────────────────
  const updateBounds = (): void => {
    const [w, h] = win.getContentSize()
    pageView.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width: w,
      height: Math.max(0, h - TOOLBAR_HEIGHT),
    })
  }
  updateBounds()
  win.on('resize', updateBounds)
  win.on('maximize', updateBounds)
  win.on('unmaximize', updateBounds)
  win.on('enter-full-screen', updateBounds)
  win.on('leave-full-screen', updateBounds)

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  win.on('closed', () => windowMap.delete(win.id))

  // ── Page state push ─────────────────────────────────────────────────────────
  const pushPageState = (): void => {
    if (win.isDestroyed()) return
    const state: PageState = {
      url: pageView.webContents.getURL(),
      title: pageView.webContents.getTitle(),
      canGoBack: pageView.webContents.canGoBack(),
      canGoForward: pageView.webContents.canGoForward(),
      isLoading: pageView.webContents.isLoading(),
    }
    win.webContents.send('page:update', state)
  }

  pageView.webContents.on('did-navigate', pushPageState)
  pageView.webContents.on('did-navigate-in-page', pushPageState)
  pageView.webContents.on('page-title-updated', pushPageState)
  pageView.webContents.on('did-start-loading', pushPageState)
  pageView.webContents.on('did-stop-loading', pushPageState)

  // External links open in OS browser, not a new Electron window
  pageView.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // ── Initial load ────────────────────────────────────────────────────────────
  // Priority: caller-supplied URL → incognito blank → default homepage
  const startUrl = options.initialUrl
    ?? (isIncognito ? 'about:blank' : 'https://www.google.com')
  pageView.webContents.loadURL(startUrl)

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// ─── Registry accessors ───────────────────────────────────────────────────────
export function getContext(winId: number): WindowContext | undefined {
  return windowMap.get(winId)
}

export function getContextFromSender(
  sender: Electron.WebContents,
): WindowContext | undefined {
  const win = BrowserWindow.fromWebContents(sender)
  if (!win) return undefined
  return windowMap.get(win.id)
}
