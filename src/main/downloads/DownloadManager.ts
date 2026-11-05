/**
 * DownloadManager — hooks into an Electron Session's 'will-download' event,
 * auto-saves files to the OS Downloads folder, tracks progress in-memory, and
 * broadcasts live updates to all open BrowserWindows.
 */
import { BrowserWindow, shell, app, type Session } from 'electron'
import { join } from 'node:path'
import type { DownloadItem, DownloadState } from '../../shared/types'

interface DownloadEntry {
  item: Electron.DownloadItem
  data: DownloadItem
}

const downloadMap = new Map<string, DownloadEntry>()

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Push the current download list to every open renderer window */
function broadcast(): void {
  const payload = Array.from(downloadMap.values()).map((e) => e.data)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('downloads:update', payload)
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once per session (default or incognito partition).
 * Subsequent calls on the same session are safe — Electron deduplicates.
 */
export function hookSession(ses: Session): void {
  ses.on('will-download', (_event, item) => {
    const id = crypto.randomUUID()

    // Auto-save to the OS Downloads folder — no dialog prompt
    const filename = item.getFilename()
    const savePath = join(app.getPath('downloads'), filename)
    item.setSavePath(savePath)

    const data: DownloadItem = {
      id,
      filename,
      url: item.getURL(),
      savePath,
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      speed: 0,
      startedAt: Date.now(),
    }

    downloadMap.set(id, { item, data })
    broadcast()

    item.on('updated', (_e, state) => {
      const entry = downloadMap.get(id)
      if (!entry) return
      entry.data.receivedBytes = item.getReceivedBytes()
      entry.data.totalBytes = item.getTotalBytes()
      entry.data.speed = item.getCurrentBytesPerSecond()
      entry.data.state = state === 'interrupted' ? 'interrupted' : 'progressing'
      broadcast()
    })

    item.on('done', (_e, state) => {
      const entry = downloadMap.get(id)
      if (!entry) return
      entry.data.state = state as DownloadState
      entry.data.receivedBytes = item.getReceivedBytes()
      entry.data.totalBytes = item.getTotalBytes()
      entry.data.speed = 0
      entry.data.savePath = item.getSavePath()
      broadcast()
    })
  })
}

export function openDownload(id: string): void {
  const entry = downloadMap.get(id)
  if (entry?.data.state === 'completed') {
    shell.openPath(entry.data.savePath)
  }
}

export function showDownloadInFolder(id: string): void {
  const entry = downloadMap.get(id)
  if (entry) {
    shell.showItemInFolder(entry.data.savePath)
  }
}

export function cancelDownload(id: string): void {
  const entry = downloadMap.get(id)
  if (entry?.data.state === 'progressing') {
    entry.item.cancel()
  }
}

export function clearCompletedDownloads(): void {
  for (const [id, { data }] of downloadMap) {
    if (data.state !== 'progressing') {
      downloadMap.delete(id)
    }
  }
}

export function getAllDownloads(): DownloadItem[] {
  return Array.from(downloadMap.values()).map((e) => e.data)
}
