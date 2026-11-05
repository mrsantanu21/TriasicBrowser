import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import type { PageState, DownloadItem, AdblockStats, Credential, AutofillState, ExtensionInfo, BrowserSettings } from '../../shared/types'
import AdblockBadge from './components/AdblockBadge'
import DownloadPanel from './components/DownloadPanel'
import ScreenshotToast from './components/ScreenshotToast'
import PasswordPopover from './components/PasswordPopover'
import AutofillBanner from './components/AutofillBanner'
import ExtensionsPanel from './components/ExtensionsPanel'
import PasswordManager from './components/PasswordManager'
import SettingsPanel from './components/SettingsPanel'
import logoImg from './assets/logo.png'
import './App.css'

// ─── Type augmentation ────────────────────────────────────────────────────────
declare global {
  interface Window {
    triasicBridge: {
      navigate: (url: string) => void
      goBack: () => void
      goForward: () => void
      reload: () => void
      stop: () => void
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      getWindowInfo: () => Promise<{ isIncognito: boolean }>
      openIncognitoWindow: () => void
      openNewWindow: () => void
      setAdblockEnabled: (enabled: boolean) => void
      getAdblockStats: () => Promise<AdblockStats>
      onAdblockStats: (cb: (stats: AdblockStats) => void) => () => void
      onDownloadsUpdate: (cb: (items: DownloadItem[]) => void) => () => void
      getAllDownloads: () => Promise<DownloadItem[]>
      openDownload: (id: string) => void
      showDownloadInFolder: (id: string) => void
      cancelDownload: (id: string) => void
      clearCompletedDownloads: () => void
      captureScreenshot: () => Promise<string | null>
      saveCredential: (origin: string, username: string, password: string) => Promise<Credential | null>
      getCredentialsByOrigin: (origin: string) => Promise<Array<{ id: string; username: string }>>
      listAllCredentials: () => Promise<Credential[]>
      deleteCredential: (id: string) => Promise<void>
      revealPassword: (id: string) => Promise<string | null>
      onAutofillAvailable: (cb: (state: AutofillState) => void) => () => void
      fillAutofill: (credentialId: string) => Promise<boolean>
      loadExtension: () => Promise<ExtensionInfo | null>
      listExtensions: () => Promise<ExtensionInfo[]>
      removeExtension: (id: string) => Promise<void>
      getSettings: () => Promise<BrowserSettings>
      updateSettings: (partial: Partial<BrowserSettings>) => Promise<BrowserSettings>
      onPageUpdate: (cb: (state: PageState) => void) => () => void
    }
    santaBridge?: Window['triasicBridge']
  }
}

const bridge = window.triasicBridge || window.santaBridge

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M9.5 2.5L5 7.5l4.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Forward: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M5.5 2.5L10 7.5l-4.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Reload: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 7.5A5.5 5.5 0 1 1 7.5 2c1.8 0 3.4.86 4.43 2.19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 2l2.43 2.19L9.5 6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Stop: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Lock: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="1.25" y="4.5" width="8.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3 4.5V3.2a2.5 2.5 0 0 1 5 0V4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  Globe: () => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <circle cx="5.5" cy="5.5" r="4.25" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5.5 1.25C4.5 3 4 4.2 4 5.5s.5 2.5 1.5 4.25M5.5 1.25C6.5 3 7 4.2 7 5.5S6.5 8 5.5 9.75M1.25 5.5h8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  Logo: () => (
    <img src={logoImg} className="brand-logo-img" alt="Triasic Logo" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
  ),
  Incognito: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 11.5C2.5 9 4.57 7 7 7s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M1 4.5h1.5M11.5 4.5H13M4.5 2.5L5.5 4M9.5 2.5L8.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Screenshot: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="4" r="0.75" fill="currentColor" />
    </svg>
  ),
  Key: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="5.5" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 8.5l4 4M10.5 9l1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Puzzle: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2h4v1.5a1.5 1.5 0 0 0 3 0V2h4v4h-1.5a1.5 1.5 0 0 0 0 3H13v4H9V11.5a1.5 1.5 0 0 0-3 0V13H2V9h1.5a1.5 1.5 0 0 0 0-3H2V2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
    </svg>
  ),
  NewWindow: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M5.5 5.5H12a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Gear: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.8 1.25h2.4l.4 1.4a4.5 4.5 0 0 1 1.05.6l1.35-.6 1.7 1.7-.6 1.35c.25.33.45.69.6 1.05l1.4.4v2.4l-1.4.4a4.5 4.5 0 0 1-.6 1.05l.6 1.35-1.7 1.7-1.35-.6c-.33.25-.69.45-1.05.6l-.4 1.4H5.8l-.4-1.4a4.5 4.5 0 0 1-1.05-.6l-1.35.6-1.7-1.7.6-1.35a4.5 4.5 0 0 1-.6-1.05l-1.4-.4V5.8l1.4-.4c.15-.36.35-.72.6-1.05l-.6-1.35 1.7-1.7 1.35.6c.33-.25.69-.45 1.05-.6l.4-1.4z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  ),
}

function Spinner() {
  return (
    <span className="spinner" aria-label="Loading">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <circle cx="5.5" cy="5.5" r="4.25" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.25" />
        <path d="M5.5 1.25A4.25 4.25 0 0 1 9.75 5.5" stroke="#e1ff00" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Page navigation state ──────────────────────────────────────────────────
  const [page, setPage] = useState<PageState>({
    url: 'https://www.google.com',
    title: 'Google',
    canGoBack: false,
    canGoForward: false,
    isLoading: true,
  })
  const [inputValue, setInputValue] = useState('https://www.google.com')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Phase 4 state ──────────────────────────────────────────────────────────
  const [isIncognito, setIsIncognito] = useState(false)
  const [adblockStats, setAdblockStats] = useState<AdblockStats>({ isEnabled: true, blockedCount: 0 })
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [downloadPanelOpen, setDownloadPanelOpen] = useState(false)
  const [screenshotToast, setScreenshotToast] = useState<string | null>(null)
  const [screenshotSavePath, setScreenshotSavePath] = useState<string | null>(null)

  // ── Phase 5 state ──────────────────────────────────────────────────────────
  const [passwordPopoverOpen, setPasswordPopoverOpen] = useState(false)
  const [passwordManagerOpen, setPasswordManagerOpen] = useState(false)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [autofillState, setAutofillState] = useState<AutofillState | null>(null)
  const [extensionsPanelOpen, setExtensionsPanelOpen] = useState(false)
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const refreshCredentials = useCallback(async () => {
    const creds = await bridge.listAllCredentials()
    setCredentials(creds)
  }, [])

  const refreshExtensions = useCallback(async () => {
    const exts = await bridge.listExtensions()
    setExtensions(exts)
  }, [])

  // ── Initialise on mount ────────────────────────────────────────────────────
  useEffect(() => {
    bridge.getWindowInfo().then((info) => setIsIncognito(info.isIncognito))
    bridge.getAdblockStats().then(setAdblockStats)
    bridge.getAllDownloads().then(setDownloads)
    refreshCredentials()
    refreshExtensions()

    const unsubPage = bridge.onPageUpdate((state) => {
      setPage(state)
      if (!isFocused) setInputValue(state.url)
    })
    const unsubAdblock = bridge.onAdblockStats(setAdblockStats)
    const unsubDownloads = bridge.onDownloadsUpdate((items) => {
      setDownloads(items)
      if (items.some((d) => d.state === 'progressing')) setDownloadPanelOpen(true)
    })
    const unsubAutofill = bridge.onAutofillAvailable((state) => {
      // Don't show autofill banner if password popover is already open
      setAutofillState(state)
    })

    return () => {
      unsubPage()
      unsubAdblock()
      unsubDownloads()
      unsubAutofill()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync URL input when not focused ────────────────────────────────────────
  useEffect(() => {
    if (!isFocused) setInputValue(page.url)
  }, [page.url, isFocused])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); bridge.openIncognitoWindow() }
      if (ctrl && !e.shiftKey && e.key === 'n') { e.preventDefault(); bridge.openNewWindow() }
      if (ctrl && e.key === 'j') { e.preventDefault(); setDownloadPanelOpen((o) => !o) }
      if (ctrl && e.shiftKey && e.key === 'S') { e.preventDefault(); handleScreenshot() }
      if (ctrl && e.key === 'l') {
        e.preventDefault()
        inputRef.current?.focus()
        requestAnimationFrame(() => inputRef.current?.select())
      }
      // Close any open overlay on Escape
      if (e.key === 'Escape') {
        if (passwordManagerOpen) setPasswordManagerOpen(false)
        else if (passwordPopoverOpen) setPasswordPopoverOpen(false)
        else if (extensionsPanelOpen) setExtensionsPanelOpen(false)
        else if (downloadPanelOpen) setDownloadPanelOpen(false)
        else if (autofillState) setAutofillState(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [passwordManagerOpen, passwordPopoverOpen, extensionsPanelOpen, downloadPanelOpen, autofillState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Address bar handlers ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { bridge.navigate(inputValue); inputRef.current?.blur() }
      if (e.key === 'Escape') { setInputValue(page.url); inputRef.current?.blur() }
    },
    [inputValue, page.url],
  )

  // ── Screenshot ─────────────────────────────────────────────────────────────
  const handleScreenshot = useCallback(async () => {
    const path = await bridge.captureScreenshot()
    if (path) { setScreenshotSavePath(path); setScreenshotToast(path) }
  }, [])

  // ── Password ───────────────────────────────────────────────────────────────
  const currentOrigin = (() => {
    try { return new URL(page.url).hostname } catch { return '' }
  })()

  const handleSavePassword = useCallback(async (username: string, password: string) => {
    await bridge.saveCredential(currentOrigin, username, password)
    await refreshCredentials()
  }, [currentOrigin, refreshCredentials])

  // ── Extensions ────────────────────────────────────────────────────────────
  const handleLoadExtension = useCallback(async () => {
    const ext = await bridge.loadExtension()
    if (ext) await refreshExtensions()
    return ext
  }, [refreshExtensions])

  const handleRemoveExtension = useCallback(async (id: string) => {
    await bridge.removeExtension(id)
    await refreshExtensions()
  }, [refreshExtensions])

  // ── Derived values ─────────────────────────────────────────────────────────
  const isSecure = page.url.startsWith('https://')
  const activeDownloads = downloads.filter((d) => d.state === 'progressing').length

  return (
    <div className="browser-shell" data-incognito={isIncognito}>

      {/* ── Settings Modal ── */}
      {settingsPanelOpen && (
        <SettingsPanel
          onClose={() => setSettingsPanelOpen(false)}
        />
      )}

      {/* ── Password Manager Modal (above everything) ── */}
      {passwordManagerOpen && (
        <PasswordManager
          credentials={credentials}
          onReveal={(id) => bridge.revealPassword(id)}
          onDelete={(id) => bridge.deleteCredential(id)}
          onClose={() => setPasswordManagerOpen(false)}
          onRefresh={refreshCredentials}
        />
      )}

      {/* ── Title Bar ── */}
      <header className="titlebar">
        <div className="titlebar-drag-region" />
        <div className="titlebar-brand">
          <span className="brand-icon">{isIncognito ? <Icons.Incognito /> : <Icons.Logo />}</span>
          <span className="brand-name">{isIncognito ? 'Incognito' : 'Triasic Browser'}</span>
          {isIncognito && <span className="incognito-pill" aria-label="Incognito mode active">Private</span>}
        </div>
        <div className="titlebar-title" aria-live="polite">
          {page.isLoading
            ? <span className="titlebar-loading-text">Loading…</span>
            : <span className="titlebar-page-title">{page.title || page.url}</span>
          }
        </div>
        <div className="window-controls" role="group" aria-label="Window controls">
          <button id="btn-minimize" className="wc-btn wc-minimize" onClick={() => bridge.minimizeWindow()} title="Minimize" aria-label="Minimize window">
            <svg width="10" height="1.5" viewBox="0 0 10 1.5"><rect width="10" height="1.5" rx="0.75" fill="currentColor" /></svg>
          </button>
          <button id="btn-maximize" className="wc-btn wc-maximize" onClick={() => bridge.maximizeWindow()} title="Maximize / Restore" aria-label="Maximize or restore window">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          </button>
          <button id="btn-close" className="wc-btn wc-close" onClick={() => bridge.closeWindow()} title="Close" aria-label="Close window">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      {/* ── Navigation Toolbar ── */}
      <nav className="toolbar" role="navigation" aria-label="Browser navigation">
        <div className="nav-group">
          <button id="btn-back" className="nav-btn" onClick={() => bridge.goBack()} disabled={!page.canGoBack} title="Go Back (Alt+Left)" aria-label="Go back"><Icons.Back /></button>
          <button id="btn-forward" className="nav-btn" onClick={() => bridge.goForward()} disabled={!page.canGoForward} title="Go Forward (Alt+Right)" aria-label="Go forward"><Icons.Forward /></button>
          <button
            id="btn-reload"
            className={`nav-btn ${page.isLoading ? 'is-loading' : ''}`}
            onClick={() => page.isLoading ? bridge.stop() : bridge.reload()}
            title={page.isLoading ? 'Stop' : 'Reload (Ctrl+R)'}
            aria-label={page.isLoading ? 'Stop loading' : 'Reload page'}
          >
            {page.isLoading ? <Icons.Stop /> : <Icons.Reload />}
          </button>
        </div>

        {/* Omnibox */}
        <div className={`omnibox ${isFocused ? 'omnibox--focused' : ''} ${page.isLoading ? 'omnibox--loading' : ''}`} role="search">
          {page.isLoading && <div className="omnibox-progress" aria-hidden="true" />}
          <span className={`omnibox-icon ${isSecure ? 'omnibox-icon--secure' : 'omnibox-icon--insecure'}`} aria-hidden="true">
            {page.isLoading ? <Spinner /> : isSecure ? <Icons.Lock /> : <Icons.Globe />}
          </span>
          <input
            ref={inputRef}
            id="address-bar"
            type="text"
            className="omnibox-input"
            value={isFocused ? inputValue : page.url}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => { setIsFocused(true); setInputValue(page.url); requestAnimationFrame(() => inputRef.current?.select()) }}
            onBlur={() => { setIsFocused(false); setInputValue(page.url) }}
            onKeyDown={handleKeyDown}
            placeholder="Search or type a URL…"
            spellCheck={false}
            autoComplete="off"
            aria-label="Address bar"
          />
          {isFocused && inputValue && (
            <button className="omnibox-clear" onMouseDown={(e) => { e.preventDefault(); setInputValue(''); inputRef.current?.focus() }} aria-label="Clear address" tabIndex={-1}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>

        {/* Toolbar right */}
        <div className="toolbar-right">

          {/* New window (Ctrl+N) */}
          <button id="btn-new-window" className="nav-btn toolbar-icon-btn" onClick={() => bridge.openNewWindow()} title="New Window (Ctrl+N)" aria-label="Open new window">
            <Icons.NewWindow />
          </button>

          {/* Incognito (Ctrl+Shift+N) */}
          <button id="btn-incognito" className={`nav-btn toolbar-icon-btn ${isIncognito ? 'toolbar-icon-btn--active-incognito' : ''}`} onClick={() => bridge.openIncognitoWindow()} title="New Incognito Window (Ctrl+Shift+N)" aria-label="Open new incognito window">
            <Icons.Incognito />
          </button>

          {/* Screenshot (Ctrl+Shift+S) */}
          <button id="btn-screenshot" className="nav-btn toolbar-icon-btn" onClick={handleScreenshot} title="Screenshot (Ctrl+Shift+S)" aria-label="Capture screenshot">
            <Icons.Screenshot />
          </button>

          {/* Downloads (Ctrl+J) */}
          <button id="btn-downloads" className={`nav-btn toolbar-icon-btn ${downloadPanelOpen ? 'toolbar-icon-btn--active' : ''}`} onClick={() => setDownloadPanelOpen((o) => !o)} title="Downloads (Ctrl+J)" aria-label="Toggle downloads panel" aria-expanded={downloadPanelOpen}>
            <Icons.Download />
            {activeDownloads > 0 && <span className="dl-active-badge" aria-label={`${activeDownloads} active downloads`}>{activeDownloads}</span>}
          </button>

          {/* Password manager 🔑 */}
          <button
            id="btn-password"
            className={`nav-btn toolbar-icon-btn ${passwordPopoverOpen ? 'toolbar-icon-btn--active' : ''}`}
            onClick={() => { setPasswordPopoverOpen((o) => !o); setExtensionsPanelOpen(false); setDownloadPanelOpen(false) }}
            title="Save / Manage passwords"
            aria-label="Password manager"
            aria-expanded={passwordPopoverOpen}
          >
            <Icons.Key />
          </button>

          {/* Extensions 🧩 */}
          <button
            id="btn-extensions"
            className={`nav-btn toolbar-icon-btn ${extensionsPanelOpen ? 'toolbar-icon-btn--active' : ''}`}
            onClick={() => { setExtensionsPanelOpen((o) => !o); setPasswordPopoverOpen(false); setDownloadPanelOpen(false) }}
            title="Extensions"
            aria-label="Extensions panel"
            aria-expanded={extensionsPanelOpen}
          >
            <Icons.Puzzle />
          </button>

          {/* Settings ⚙️ */}
          <button
            id="btn-settings"
            className={`nav-btn toolbar-icon-btn ${settingsPanelOpen ? 'toolbar-icon-btn--active' : ''}`}
            onClick={() => { setSettingsPanelOpen((o) => !o); setExtensionsPanelOpen(false); setPasswordPopoverOpen(false); setDownloadPanelOpen(false) }}
            title="Settings"
            aria-label="Browser settings"
            aria-expanded={settingsPanelOpen}
          >
            <Icons.Gear />
          </button>

          {/* Ad blocker badge */}
          <AdblockBadge
            stats={adblockStats}
            onToggle={() => bridge.setAdblockEnabled(!adblockStats.isEnabled)}
          />

          {/* Security badge */}
          <div
            className={`security-badge ${isSecure ? 'security-badge--secure' : 'security-badge--warn'}`}
            aria-label={isSecure ? 'Connection is secure' : 'Connection is not secure'}
          >
            {isSecure ? 'Secure' : 'Not secure'}
          </div>
        </div>
      </nav>

      {/* ── Autofill Banner (floats below toolbar) ── */}
      {autofillState && !passwordPopoverOpen && (
        <AutofillBanner
          state={autofillState}
          onFill={() => bridge.fillAutofill(autofillState.credentialId)}
          onDismiss={() => setAutofillState(null)}
        />
      )}

      {/* ── Password Popover (drops from key icon) ── */}
      {passwordPopoverOpen && (
        <PasswordPopover
          currentOrigin={currentOrigin}
          onSave={handleSavePassword}
          onManage={() => { setPasswordPopoverOpen(false); setPasswordManagerOpen(true) }}
          onClose={() => setPasswordPopoverOpen(false)}
        />
      )}

      {/* ── Download Panel ── */}
      {downloadPanelOpen && (
        <DownloadPanel
          downloads={downloads}
          onClose={() => setDownloadPanelOpen(false)}
          onOpen={(id) => bridge.openDownload(id)}
          onShowInFolder={(id) => bridge.showDownloadInFolder(id)}
          onCancel={(id) => bridge.cancelDownload(id)}
          onClearCompleted={() => bridge.clearCompletedDownloads()}
        />
      )}

      {/* ── Extensions Panel ── */}
      {extensionsPanelOpen && (
        <ExtensionsPanel
          extensions={extensions}
          onClose={() => setExtensionsPanelOpen(false)}
          onLoad={handleLoadExtension}
          onRemove={handleRemoveExtension}
        />
      )}

      {/* ── Screenshot Toast ── */}
      {screenshotToast && (
        <ScreenshotToast
          savePath={screenshotToast}
          onDismiss={() => setScreenshotToast(null)}
          onReveal={() => screenshotSavePath && bridge.showDownloadInFolder(screenshotSavePath)}
        />
      )}
    </div>
  )
}
