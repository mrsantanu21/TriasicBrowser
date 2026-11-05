/**
 * AutoUpdater — manages application auto-updates using electron-updater.
 * Listens for update checks, download progress, and ready-to-install events.
 */
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from '../logger'

autoUpdater.logger = log

export function initAutoUpdater(): void {
  autoUpdater.on('checking-for-update', () => {
    log.info('[AutoUpdater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('[AutoUpdater] Update available:', info.version)
    broadcastUpdateStatus('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('[AutoUpdater] Update not available:', info.version)
    broadcastUpdateStatus('update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    log.error('[AutoUpdater] Error in auto-updater:', err)
    broadcastUpdateStatus('update-error', err?.message ?? 'Update error')
  })

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`[AutoUpdater] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`)
    broadcastUpdateStatus('update-download-progress', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[AutoUpdater] Update downloaded:', info.version)
    broadcastUpdateStatus('update-downloaded', info)
  })
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.error('[AutoUpdater] Failed to check for updates:', err)
  })
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

function broadcastUpdateStatus(event: string, data: any): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(`updater:${event}`, data)
    }
  }
}
