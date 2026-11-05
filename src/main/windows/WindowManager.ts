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
import type { PageState, Tab, TabGroup, TabSnapshot, TabWindowSnapshot } from '../../shared/types'

const isDev = !app.isPackaged
export const APP_ICON_PATH = app.isPackaged
  ? join(process.resourcesPath, 'triasic-icon.png')
  : join(app.getAppPath(), 'build', 'icon.png')

/** Pixels reserved for titlebar, toolbar, and the horizontal tab strip. */
export const TOOLBAR_HEIGHT = 108

// ─── Context record ───────────────────────────────────────────────────────────
export interface WindowContext {
  win: BrowserWindow
  tabs: Map<string, { view: WebContentsView; pinned: boolean; groupId: string | null }>
  activeTabId: string
  groups: TabGroup[]
  recentlyClosed: TabSnapshot[]
  verticalTabs: boolean
  readonly pageView: WebContentsView
  isIncognito: boolean
  /** The Electron Session used by pageView — may be non-persistent for incognito */
  pageSession: Session
}

const windowMap = new Map<number, WindowContext>()
const recentlyClosedWindows: TabWindowSnapshot[] = []

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
export function createWindow(options: { incognito?: boolean; initialUrl?: string; initialTab?: Partial<TabSnapshot> } = {}): BrowserWindow {
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
    icon: APP_ICON_PATH,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const ctx = { win, tabs: new Map<string, { view: WebContentsView; pinned: boolean; groupId: string | null }>(), activeTabId: '', groups: [] as TabGroup[], recentlyClosed: [] as TabSnapshot[], verticalTabs: false, isIncognito, pageSession } as unknown as WindowContext
  Object.defineProperty(ctx, 'pageView', { get: () => ctx.tabs.get(ctx.activeTabId)!.view })
  windowMap.set(win.id, ctx)

  // ── Bounds management ───────────────────────────────────────────────────────
  const updateBounds = (): void => {
    const [w, h] = win.getContentSize()
    for (const [id, tab] of ctx.tabs) {
      const active = id === ctx.activeTabId
      tab.view.setVisible(active)
      tab.view.setBounds(ctx.verticalTabs
        ? { x: active ? 220 : 0, y: 74, width: active ? Math.max(0, w - 220) : 0, height: Math.max(0, h - 74) }
        : { x: 0, y: TOOLBAR_HEIGHT, width: active ? w : 0, height: active ? Math.max(0, h - TOOLBAR_HEIGHT) : 0 })
    }
  }
  updateBounds()
  win.on('resize', updateBounds)
  win.on('maximize', updateBounds)
  win.on('unmaximize', updateBounds)
  win.on('enter-full-screen', updateBounds)
  win.on('leave-full-screen', updateBounds)

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  win.on('closed', () => {
    if (!isIncognito && ctx.tabs.size > 0) {
      recentlyClosedWindows.unshift(snapshotTabs(ctx))
      recentlyClosedWindows.splice(10)
    }
    windowMap.delete(win.id)
  })

  createTab(ctx, options.initialUrl ?? (isIncognito ? 'about:blank' : 'https://www.google.com'), options.initialTab)

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function emitTabs(ctx: WindowContext): void {
  if (ctx.win.isDestroyed()) return
  ctx.win.webContents.send('tabs:update', getTabs(ctx))
  const wc = ctx.pageView.webContents
  const state: PageState = { url: wc.getURL(), title: wc.getTitle(), canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward(), isLoading: wc.isLoading() }
  ctx.win.webContents.send('page:update', state)
}

export function getTabs(ctx: WindowContext): Tab[] {
  return [...ctx.tabs].map(([id, tab]) => ({ id, url: tab.view.webContents.getURL(), title: tab.view.webContents.getTitle() || 'New Tab', favicon: null, isLoading: tab.view.webContents.isLoading(), isPinned: tab.pinned, isActive: id === ctx.activeTabId, groupId: tab.groupId, groupTitle: ctx.groups.find((group) => group.id === tab.groupId)?.title ?? null }))
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (a.groupTitle ?? '').localeCompare(b.groupTitle ?? ''))
}

export function snapshotTabs(ctx: WindowContext): TabWindowSnapshot {
  return { tabs: getTabs(ctx).map(({ id, url, title, isPinned, groupId }) => ({ id, url, title, isPinned, groupId })), activeTabId: ctx.activeTabId, groups: ctx.groups }
}

export function takeRecentlyClosedWindow(activeTabId?: string): TabWindowSnapshot | undefined {
  const index = activeTabId ? recentlyClosedWindows.findIndex((window) => window.activeTabId === activeTabId) : 0
  if (index < 0) return undefined
  return recentlyClosedWindows.splice(index, 1)[0]
}

export function listRecentlyClosedWindows(): TabWindowSnapshot[] {
  return [...recentlyClosedWindows]
}

export function createTab(ctx: WindowContext, url = 'https://www.google.com', options: Partial<TabSnapshot> = {}): string {
  const id = options.id ?? randomUUID()
  const view = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, session: ctx.pageSession } })
  ctx.win.contentView.addChildView(view)
  ctx.tabs.set(id, { view, pinned: options.isPinned ?? false, groupId: options.groupId ?? null })
  ctx.activeTabId = id
  const update = (): void => { if (!ctx.win.isDestroyed()) { updateWindowBounds(ctx); emitTabs(ctx) } }
  view.webContents.on('did-navigate', update)
  view.webContents.on('did-navigate-in-page', update)
  view.webContents.on('page-title-updated', update)
  view.webContents.on('did-start-loading', update)
  view.webContents.on('did-stop-loading', update)
  view.webContents.setWindowOpenHandler(({ url: target }) => { shell.openExternal(target); return { action: 'deny' } })
  updateWindowBounds(ctx)
  view.webContents.loadURL(url)
  emitTabs(ctx)
  return id
}

export function activateTab(ctx: WindowContext, id: string): void {
  if (!ctx.tabs.has(id)) return
  ctx.activeTabId = id
  updateWindowBounds(ctx)
  emitTabs(ctx)
}

export function closeTab(ctx: WindowContext, id: string, remember = true): void {
  const tab = ctx.tabs.get(id)
  if (!tab) return
  const wc = tab.view.webContents
  if (remember && !ctx.isIncognito) {
    ctx.recentlyClosed.unshift({ id, url: wc.getURL(), title: wc.getTitle() || 'New Tab', isPinned: tab.pinned, groupId: tab.groupId })
    ctx.recentlyClosed = ctx.recentlyClosed.slice(0, 20)
  }
  const ids = [...ctx.tabs.keys()]
  const index = ids.indexOf(id)
  ctx.tabs.delete(id)
  ctx.win.contentView.removeChildView(tab.view)
  if (!wc.isDestroyed()) wc.close()
  if (!ctx.tabs.size) createTab(ctx)
  else if (ctx.activeTabId === id) activateTab(ctx, ids[index - 1] ?? ids[index + 1])
  emitTabs(ctx)
}

export function updateWindowBounds(ctx: WindowContext): void {
  if (ctx.win.isDestroyed()) return
  const [w, h] = ctx.win.getContentSize()
  for (const [id, tab] of ctx.tabs) {
    const active = id === ctx.activeTabId
    tab.view.setVisible(active)
    tab.view.setBounds(ctx.verticalTabs
      ? { x: active ? 220 : 0, y: 74, width: active ? Math.max(0, w - 220) : 0, height: active ? Math.max(0, h - 74) : 0 }
      : { x: 0, y: TOOLBAR_HEIGHT, width: active ? w : 0, height: active ? Math.max(0, h - TOOLBAR_HEIGHT) : 0 })
  }
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
