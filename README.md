# Triasic Browser

A modern, fast, cross-platform desktop web browser built from scratch with **Electron**, **React**, **TypeScript**, and **Node.js**.

Inspired by the best parts of Arc, Brave, Edge, and Chrome — built with a unique visual identity, a fully custom shell, and privacy features baked in from the start.

---

## ✨ Features

| Category | What's included |
|---|---|
| 🎨 **Design & Shell** | Frameless titlebar, custom visual identity, responsive layout, dark/light/custom themes |
| 🌐 **Core Browsing** | Multi-tab browsing, address/search bar, back/forward/refresh, HTTPS security badge |
| 🗂️ **Tab Management** | Search open tabs, pinned tabs kept at the front, named tab groups, drag to reorder, recently closed tab and window restore, optional vertical tab rail |
| ⬇️ **Downloads** | Slide-in download panel with live progress, open/reveal actions |
| 🕵️ **Incognito Mode** | Separate private window with memory-only session — nothing touches disk |
| 🛡️ **Privacy** | Built-in ad/tracker blocker with a real-time blocked-request counter |
| 🔑 **Password Manager** | OS-encrypted credential storage (DPAPI/Keychain/libsecret), autofill, and a full password manager UI |
| 🔄 **Session Restore** | Automatically reopens regular windows and all their tabs after restart; older single-page sessions remain supported |
| 🪟 **Multi-Window** | Open and manage independent browser windows |
| 🧩 **Extensions** | Load unpacked Chrome extensions from disk |
| 📸 **Screenshot Tool** | One-shortcut viewport capture, saved locally with a confirmation toast |
| ⚙️ **Settings** | Search engine selection (Google, Bing, DuckDuckGo, custom), custom homepage, live-applied preferences |
| 🖥️ **Built-in DevTools** | Full Chromium DevTools per tab |
| ⌨️ **Keyboard Shortcuts** | Fast, native shortcuts for every core action |

---

## 📦 Download

Download the Windows installer (`.exe`) or Android app (`.apk`) from the [Releases page](../../releases). To create a release, push a version tag such as `v0.1.0`; GitHub Actions builds both files and attaches them to that release.

The Android edition is a touch-friendly mobile browser for Android 6.0 and newer. It includes web browsing, address/search, back and forward navigation, reload, home, and page sharing. It is a native Android WebView app; desktop-only features such as Chrome extension loading and the desktop password manager are not included in this first mobile edition.

> **Windows note:** The Windows installer is currently unsigned. Windows SmartScreen may show a warning on first launch.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+T` | Reopen the most recently closed tab |
| `Ctrl+Shift+A` | Focus open-tab search |
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
- **[@ghostery/adblocker-electron](https://github.com/ghostery/adblocker)** — ad/tracker blocking
- **[electron-updater](https://www.electron.build/auto-update)** — auto-updates
- **[electron-log](https://github.com/megahertz/electron-log)** — centralized logging

---

## 🚀 Building from Source

```bash
# Clone the repo
git clone https://github.com/mrsantanu21/TriasicBrowser.git
cd TriasicBrowser

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build a Windows installer locally
npm run package:win

# Build the Electron app without packaging it
npm run build
```

The Windows installer will be output to the `dist/` folder. To publish it for download, push a version tag to GitHub:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The `Build and publish releases` workflow runs on GitHub Actions for each version tag. It attaches the Windows `.exe` and Android `.apk` to the GitHub Release. The APK is a debug-signed build for direct installation; install it on Android by opening the downloaded APK and allowing installs from that source if prompted.

The mobile app can also be built from the `android/` project with Android SDK platform 36, Java 17, and Gradle 8.13:

```bash
gradle --no-daemon -p android :app:assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

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
