/**
 * ScreenshotManager — captures the current viewport of a WebContentsView
 * and writes it as a PNG into ~/Pictures/TriasicBrowser/.
 * Returns the absolute save path so the renderer can show a toast.
 */
import { app } from 'electron'
import { join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import type { WindowContext } from '../windows/WindowManager'

export async function captureScreenshot(ctx: WindowContext): Promise<string> {
  // capturePage() returns an Electron NativeImage of the visible viewport
  const image = await ctx.pageView.webContents.capturePage()
  const png = image.toPNG()

  // Ensure the target directory exists
  const screenshotsDir = join(app.getPath('pictures'), 'TriasicBrowser')
  mkdirSync(screenshotsDir, { recursive: true })

  // Timestamp-based filename: screenshot-2026-07-27T11-10-00-000Z.png
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `screenshot-${timestamp}.png`
  const savePath = join(screenshotsDir, filename)

  writeFileSync(savePath, png)
  return savePath
}
