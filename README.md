# Triasic Browser

A modern, fast, cross-platform desktop web browser built from scratch with **Electron**, **React**, **TypeScript**, and **Node.js**.

Inspired by the best parts of Arc, Brave, Edge, and Chrome — built with a unique visual identity, a fully custom shell, and privacy features baked in from the start.

---

## ✨ Features

| Category | What's included |
|---|---|
| 🎨 **Design & Shell** | Frameless titlebar, custom visual identity, responsive layout, dark/light/custom themes |
| 🌐 **Core Browsing** | Tabbed browsing (open, close, duplicate, pin), address/search bar, back/forward/refresh/home, HTTPS security badge |
| 🔖 **Bookmarks & History** | Full bookmark manager with folders, searchable browsing history |
| ⬇️ **Downloads** | Slide-in download panel with live progress, open/reveal actions |
| 🕵️ **Incognito Mode** | Separate private window with memory-only session — nothing touches disk |
| 🛡️ **Privacy** | Built-in ad/tracker blocker with a real-time blocked-request counter |
| 🔑 **Password Manager** | OS-encrypted credential storage (DPAPI/Keychain/libsecret), autofill, and a full password manager UI |
| 🔄 **Session Restore** | Automatically reopens your tabs and windows after restart |
| 🪟 **Multi-Window** | Open and manage independent browser windows |
| 🧩 **Extensions** | Load unpacked Chrome extensions from disk |
| 📸 **Screenshot Tool** | One-shortcut viewport capture, saved locally with a confirmation toast |
| ⚙️ **Settings** | Search engine selection (Google, Bing, DuckDuckGo, custom), custom homepage, live-applied preferences |
| 🖥️ **Built-in DevTools** | Full Chromium DevTools per tab |
| ⌨️ **Keyboard Shortcuts** | Fast, native shortcuts for every core action |

---

## 📦 Download

Grab the latest installer from the [Releases page](../../releases).

> **Note:** This build is currently **unsigned**. On first launch, Windows SmartScreen may show a warning — click **More info → Run anyway** to proceed. This is expected for early-stage/indie software and does not affect functionality.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+N` | New window |
| `Ctrl+Shift+N` | New incognito window |
| `Ctrl+J` | Toggle download panel |
| `Ctrl+Shift+S` | Take a screenshot |
| `F11` | Toggle full screen |
| `F12` / `Ctrl+Shift+I` | Open DevTools |
| `Escape` | Close active panel/modal/popover |

---

## 🛠️ Tech Stack

- **[Electron](https://www.electronjs.org/)** — cross-platform desktop shell
- **[React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)** — UI layer
- **[Vite](https://vitejs.dev/)** — renderer bundling
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** — local storage (history, bookmarks, settings)
- **[@ghostery/adblocker-electron](https://github.com/ghostery/adblocker)** — ad/tracker blocking
- **[electron-updater](https://www.electron.build/auto-update)** — auto-updates
- **[electron-log](https://github.com/megahertz/electron-log)** — centralized logging
- **[Framer Motion](https://www.framer.com/motion/)** — UI animations

---

## 🚀 Building from Source

```bash
# Clone the repo
git clone https://github.com/<your-username>/triasic-browser.git
cd triasic-browser

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build a production installer
npm run build
```

The packaged installer will be output to the `dist/` folder.

---

## 🔒 Security Notes

- Renderer processes run fully sandboxed (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`) — no direct Node/OS access outside the main process.
- Saved passwords are encrypted at rest via the OS-level `safeStorage` API (Keychain on macOS, DPAPI on Windows, libsecret on Linux) — never stored in plaintext.
- Incognito windows use a non-persistent session partition — no history, cookies, or cache written to disk.

---

## 🗺️ Roadmap

- [ ] Code signing (Windows + macOS) to remove install warnings
- [ ] macOS and Linux packaged builds
- [ ] Broader Chrome extension (MV3) compatibility
- [ ] Automated E2E test suite (Playwright)

---

## 📄 License

*Add your chosen license here (e.g. MIT).*

---

## 🙋 Contributing

Issues and pull requests are welcome. If you find a bug, please include your OS, the exact steps to reproduce, and (if possible) the relevant log from `%USERPROFILE%\AppData\Roaming\TriasicBrowser\logs\main.log` (Windows) or the equivalent path on your platform.
