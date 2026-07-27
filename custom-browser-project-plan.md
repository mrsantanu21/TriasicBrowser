# SantaBrowser — Custom Cross-Platform Browser

### Full Architecture & Vibe-Coding Roadmap (Electron + React + TypeScript + Node.js)

---

## 1. Project Snapshot

|                        |                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| **Name**               | Triasic Browser                                                                                       |
| **Core stack**         | Electron 30+, React 18, TypeScript 5, Vite (renderer bundling), Node.js                               |
| **Target OS**          | Windows, macOS, Linux                                                                                 |
| **Design inspiration** | Arc (sidebar/spaces), Brave (privacy + shields), Edge (collections/vertical tabs), Chrome (stability) |
| **Build approach**     | Electron `BrowserWindow` for the shell UI + `<webview>`/`WebContentsView` for actual page rendering   |

**Key architectural decision up front:** Electron itself is Chromium under the hood, so you are not writing your own rendering engine — you're building a **shell** (chrome UI) around Chromium's `WebContents`. This is exactly how Brave, Arc, and Edge are built (Chromium fork/embed + custom shell), just at a much lighter scale using Electron instead of a full Chromium fork. That's the right scope for a solo/AI-assisted project.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Electron Main Process                │
│  (Node.js — full system access, no direct UI)            │
│                                                            │
│  ├─ Window Manager        (multi-window, session restore) │
│  ├─ Tab/WebContents Manager (create/destroy webviews)     │
│  ├─ IPC Router             (typed channels, validated)    │
│  ├─ Storage Layer          (SQLite/lowdb: history, bookmarks,│
│  │                          settings, passwords - encrypted)│
│  ├─ Download Manager       (session.on('will-download'))  │
│  ├─ Ad-blocker Engine      (@ghostery/adblocker-electron)  │
│  ├─ Extension Loader       (Chrome extension API subset)   │
│  ├─ Auto-updater           (electron-updater)              │
│  └─ Native Menus/Shortcuts (Menu, globalShortcut)          │
└───────────────────────┬───────────────────────────────────┘
                         │ IPC (contextBridge, typed)
┌───────────────────────┴───────────────────────────────────┐
│                  Preload Script (isolated)                 │
│  Exposes a minimal, whitelisted API to the renderer via    │
│  contextBridge.exposeInMainWorld — NEVER exposes ipcRenderer│
│  or Node APIs directly.                                    │
└───────────────────────┬───────────────────────────────────┘
                         │
┌───────────────────────┴───────────────────────────────────┐
│              Renderer Process (React + TypeScript)         │
│                                                             │
│  ├─ Chrome UI: TabStrip, AddressBar, Sidebar, Toolbar      │
│  ├─ Pages: Settings, History, Bookmarks, Downloads,        │
│  │         New Tab / Homepage                              │
│  ├─ State: Zustand (matches your existing stack choice)    │
│  ├─ Theming: CSS variables + Tailwind, dark/light + custom │
│  └─ Each actual "web page" is rendered in its OWN          │
│      WebContentsView layered by main process — the React   │
│      UI never renders page content itself, it only draws   │
│      chrome/frame around it and tells main where to        │
│      position the view.                                    │
└─────────────────────────────────────────────────────────────┘
```

**Why this separation matters:** Chromium security model requires that only the main process touches Node/OS APIs. Renderer stays sandboxed (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`). This is non-negotiable for a "production-ready" and "secure" browser — it's the #1 thing real browsers get audited on.

---

## 3. Folder Structure

```
santabrowser/
├── package.json
├── electron-builder.yml            # packaging config for win/mac/linux
├── tsconfig.json
├── tsconfig.main.json               # separate tsconfig for main process
├── vite.config.ts                   # renderer build
│
├── src/
│   ├── main/                        # Electron main process (Node)
│   │   ├── index.ts                 # app entry, lifecycle events
│   │   ├── windows/
│   │   │   ├── WindowManager.ts     # create/track BrowserWindows
│   │   │   └── SessionRestore.ts
│   │   ├── tabs/
│   │   │   ├── TabManager.ts        # create/destroy WebContentsView per tab
│   │   │   └── TabBoundsCalculator.ts
│   │   ├── ipc/
│   │   │   ├── channels.ts          # typed channel name constants
│   │   │   ├── navigation.handlers.ts
│   │   │   ├── tabs.handlers.ts
│   │   │   ├── bookmarks.handlers.ts
│   │   │   ├── history.handlers.ts
│   │   │   ├── downloads.handlers.ts
│   │   │   ├── settings.handlers.ts
│   │   │   └── passwords.handlers.ts
│   │   ├── storage/
│   │   │   ├── db.ts                 # better-sqlite3 instance
│   │   │   ├── historyStore.ts
│   │   │   ├── bookmarkStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── passwordStore.ts      # OS keychain via `keytar`/`safeStorage`
│   │   ├── downloads/
│   │   │   └── DownloadManager.ts
│   │   ├── privacy/
│   │   │   ├── AdblockEngine.ts      # ghostery/adblocker-electron
│   │   │   └── IncognitoSessionFactory.ts
│   │   ├── extensions/
│   │   │   └── ExtensionLoader.ts    # loads unpacked Chrome extensions
│   │   ├── menu/
│   │   │   └── AppMenu.ts            # native menu + shortcuts map
│   │   ├── updater/
│   │   │   └── AutoUpdater.ts
│   │   └── logger.ts                 # electron-log wrapper
│   │
│   ├── preload/
│   │   └── index.ts                  # contextBridge whitelisted API
│   │
│   ├── shared/                       # types shared between main & renderer
│   │   ├── types.ts                  # Tab, Bookmark, HistoryEntry, Settings...
│   │   └── ipc-contract.ts           # request/response typing per channel
│   │
│   └── renderer/                     # React + TS app (Vite)
│       ├── main.tsx
│       ├── App.tsx
│       ├── store/                    # Zustand stores
│       │   ├── tabStore.ts
│       │   ├── settingsStore.ts
│       │   ├── historyStore.ts
│       │   └── bookmarkStore.ts
│       ├── components/
│       │   ├── chrome/               # browser "frame" UI
│       │   │   ├── TabStrip/
│       │   │   ├── AddressBar/
│       │   │   ├── Toolbar/
│       │   │   ├── Sidebar/
│       │   │   └── FindInPage/
│       │   ├── common/               # buttons, icons, modals (reusable)
│       │   └── layout/
│       ├── pages/
│       │   ├── NewTab/
│       │   ├── Settings/
│       │   ├── History/
│       │   ├── Bookmarks/
│       │   ├── Downloads/
│       │   └── PasswordManager/
│       ├── hooks/
│       │   ├── useIpc.ts
│       │   ├── useKeyboardShortcuts.ts
│       │   └── useTheme.ts
│       ├── themes/
│       │   ├── dark.css
│       │   ├── light.css
│       │   └── theme-tokens.ts
│       └── utils/
│
├── build/                            # icons, entitlements (mac), installer assets
└── tests/
    ├── unit/
    └── e2e/                          # Playwright for Electron
```

This mirrors the separation you already use well in SANTA.Store (feature-folder + store pattern) — just split across `main` vs `renderer` because Electron forces that boundary.

---

## 4. Feature → Technical Approach Map

| Feature                                    | How it's built                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabbed browsing (open/close/duplicate/pin) | `TabManager` in main keeps a `Map<tabId, WebContentsView>`; React `tabStore` mirrors state for UI only. Pin = flag that changes tab-strip width + excludes from "close all".                                                                                                                             |
| Address/search bar                         | Renderer input → on submit, detects URL vs query (regex + heuristic) → IPC to main → `webContents.loadURL`. Autocomplete from history+bookmarks (fuzzy match, debounced).                                                                                                                                |
| Back/Forward/Refresh/Home                  | Map to `webContents.goBack()/goForward()/reload()`. Home loads user's custom homepage URL from settings.                                                                                                                                                                                                 |
| Bookmark manager                           | SQLite table, folders as adjacency list, drag-reorder in UI, star icon toggles via IPC.                                                                                                                                                                                                                  |
| Browsing history                           | SQLite table `history(url, title, visitedAt, faviconUrl)`, indexed by `visitedAt`; History page groups by day.                                                                                                                                                                                           |
| Download manager                           | Hook `session.on('will-download')`, track progress events, store metadata in SQLite, show in-app tray/panel + native OS notification on complete.                                                                                                                                                        |
| Incognito mode                             | Separate `session.fromPartition('incognito-' + uuid)` per incognito window — non-persistent partition, no disk writes, distinct UI theme accent to signal mode.                                                                                                                                          |
| Dark/Light themes + custom                 | CSS variables (`--bg`, `--accent`, `--surface`...) swapped at root; persist choice in settings store; supports a 3rd "custom" theme with a color picker (fits your "modern new-gen theme" ask).                                                                                                          |
| Settings page                              | Single source of truth in SQLite `settings` table; React reads/writes via IPC; live-apply without restart where possible.                                                                                                                                                                                |
| Search engine selection                    | Enum of engines with URL templates (`https://www.google.com/search?q=%s`, Bing, DuckDuckGo, custom); stored per-profile.                                                                                                                                                                                 |
| Custom homepage                            | Setting: `homepageUrl` OR `useNewTabPageInstead`.                                                                                                                                                                                                                                                        |
| Keyboard shortcuts                         | Centralize in `AppMenu.ts` (native accelerators, e.g. Cmd/Ctrl+T, Ctrl+Shift+N) — native accelerators are more reliable cross-platform than DOM `keydown` listeners for global actions.                                                                                                                  |
| Session restore                            | On `before-quit`, serialize open windows/tabs/scroll positions to a JSON snapshot; on launch, offer "Restore previous session."                                                                                                                                                                          |
| Multiple windows                           | `WindowManager` supports N independent `BrowserWindow`s, each with its own `TabManager` instance.                                                                                                                                                                                                        |
| Full-screen mode                           | `win.setFullScreen(true)`; F11 accelerator; hide chrome UI, show minimal exit-fullscreen hint (like Chrome).                                                                                                                                                                                             |
| Zoom in/out                                | `webContents.setZoomLevel()`, persist per-site zoom preference like Chrome does.                                                                                                                                                                                                                         |
| PDF viewing                                | Chromium's built-in PDF viewer works automatically inside `WebContentsView` for most PDFs — no extra lib needed for basic viewing; can enhance with `pdf.js` for a fully custom UI shell later.                                                                                                          |
| Screenshot tool                            | `webContents.capturePage()` for viewport, or `desktopCapturer` for full-window/region select overlay.                                                                                                                                                                                                    |
| Password manager                           | Use Electron's `safeStorage` (OS-level encryption: Keychain/DPAPI/libsecret) to encrypt credentials before storing in SQLite. Never store plaintext. Autofill via a content-script-like injection into the target `WebContentsView`.                                                                     |
| Extension support                          | Electron supports loading **unpacked** Chrome extensions via `session.loadExtension()` — good coverage for MV2/basic MV3 extensions (ad blockers, note-takers). Full Chrome Web Store parity is _not_ realistic solo — scope this explicitly as "supports manually-installed unpacked extensions" in v1. |
| Ad blocker                                 | `@ghostery/adblocker-electron` — plugs into `session.webRequest`, uses EasyList/EasyPrivacy filter lists, near-zero perf cost.                                                                                                                                                                           |
| Built-in DevTools                          | `webContents.openDevTools()` per-tab (F12 / Ctrl+Shift+I), same DevTools Chromium already ships.                                                                                                                                                                                                         |
| Smooth animations                          | Framer Motion for tab open/close, sidebar slide, page transitions; keep to <200ms durations for a "snappy not sluggish" feel.                                                                                                                                                                            |

---

## 5. Security Checklist (non-negotiable for a browser)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on every `WebContentsView`/`webPreferences`.
- Strict `contextBridge` allowlist in preload — expose functions, never raw `ipcRenderer`.
- Validate/sanitize every IPC payload in main (don't trust renderer input, ever — treat it like an API boundary).
- CSP headers on your own app's chrome UI (New Tab, Settings pages).
- `safeStorage` for all secrets (passwords, saved form data) — OS keychain-backed encryption.
- Disable `remote` module entirely (deprecated/insecure).
- Pin and audit third-party deps (`npm audit`, Dependabot) since a browser is a high-value attack surface.
- Incognito sessions: verify no writes to disk (test by inspecting `session.partition` behavior).
- Auto-update signed builds only (electron-builder + code signing certs for mac/win to avoid OS security warnings).

---

## 6. Performance Notes

- Suspend/throttle background tabs (`webContents.setBackgroundThrottling`) — big memory/CPU win, same trick Chrome/Edge use.
- Lazy-create `WebContentsView` only when a tab is actually activated; keep inactive tabs as lightweight state + a cached favicon/title until clicked (huge RAM savings with many tabs — this is basically Arc's "tab hibernation").
- Debounce history writes and autocomplete queries.
- Use `better-sqlite3` (synchronous, fast) over async SQLite wrappers for local data — it's the standard high-perf choice in Electron apps.
- Code-split Settings/History/Bookmarks/Downloads pages (React lazy + Suspense) so New Tab loads instantly.

---

## 7. Vibe-Coding Roadmap (build order for AI-assisted development)

Trying to prompt an AI coding tool to "build the whole browser" in one shot will produce something broken. Build it in these phases, each a self-contained, testable milestone — this is the order I'd feed to Claude Code / Cursor one phase at a time:

**Phase 0 — Skeleton**
Electron + Vite + React + TS boilerplate, one window, one hardcoded `WebContentsView` loading google.com. Verify contextIsolation/sandbox works and preload bridge fires.

**Phase 1 — Core Browsing Shell**
Tab strip (open/close/switch), address bar with load, back/forward/refresh, tab-to-webcontents mapping in `TabManager`.

**Phase 2 — Persistence Layer**
SQLite setup, history read/write, bookmarks CRUD, settings store — all wired through typed IPC.

**Phase 3 — UI Polish**
Theming system (dark/light/custom), animations, New Tab page, keyboard shortcuts, full-screen, zoom.

**Phase 4 — Privacy & Power Features**
Incognito mode, ad blocker integration, download manager, screenshot tool.

**Phase 5 — Advanced**
Password manager (safeStorage), session restore, multi-window, extension loader, PDF viewer polish.

**Phase 6 — Ship**
electron-builder configs per OS, auto-updater, code signing, crash/error logging (electron-log + Sentry optional), E2E tests (Playwright's Electron support).

For each phase, good vibe-coding prompts are scoped to **one module** at a time ("build TabManager.ts with these exact methods and this Tab type") rather than "build tab feature" — narrow prompts + your own review between phases will keep the codebase coherent as it grows, rather than drifting into inconsistent patterns across files.

---

## 8. Suggested `package.json` Core Dependencies

```json
{
  "dependencies": {
    "electron": "^31.0.0",
    "react": "^18.3.0",
    "zustand": "^4.5.0",
    "better-sqlite3": "^11.0.0",
    "@ghostery/adblocker-electron": "^2.0.0",
    "electron-updater": "^6.0.0",
    "electron-log": "^5.0.0",
    "framer-motion": "^11.0.0",
    "keytar": "^7.9.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "electron-builder": "^24.13.0",
    "@playwright/test": "^1.45.0"
  }
}
```

---

## 9. Naming/Branding Note

"SantaBrowser" lines up nicely with your SANTA. brand aesthetic (zinc-950 + `#e1ff00` accent, Cabinet Grotesk/Satoshi) — you could carry that same visual identity into this project so it sits in the same portfolio universe. Happy to sketch a matching theme token set (colors, type scale, tab-strip shape language) once you're ready for Phase 3 UI work.

---

**Next step:** tell me which phase you want to start coding first, and I'll generate the exact file-by-file scaffold and starter code for that phase.
