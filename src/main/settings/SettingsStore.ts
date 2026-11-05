/**
 * SettingsStore — manages user configuration in app.getPath('userData')/settings.json
 */
import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { BrowserSettings } from '../../shared/types'

const settingsPath = join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS: BrowserSettings = {
  homepageUrl: 'https://www.google.com',
  searchEngine: 'google',
  theme: 'dark',
  accentColor: '#a855f7',
  showBookmarksBar: false,
  blockAds: true,
  restoreOnLaunch: true,
}

export function getSettings(): BrowserSettings {
  try {
    if (existsSync(settingsPath)) {
      const raw = readFileSync(settingsPath, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch (err) {
    console.error('[SettingsStore] Failed to read settings, using defaults:', err)
  }
  return { ...DEFAULT_SETTINGS }
}

export function updateSettings(partial: Partial<BrowserSettings>): BrowserSettings {
  try {
    const current = getSettings()
    const updated = { ...current, ...partial }
    writeFileSync(settingsPath, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  } catch (err) {
    console.error('[SettingsStore] Failed to save settings:', err)
    return getSettings()
  }
}

export function getSearchUrlTemplate(engine: BrowserSettings['searchEngine']): string {
  switch (engine) {
    case 'duckduckgo':
      return 'https://duckduckgo.com/?q=%s'
    case 'bing':
      return 'https://www.bing.com/search?q=%s'
    case 'brave':
      return 'https://search.brave.com/search?q=%s'
    case 'google':
    default:
      return 'https://www.google.com/search?q=%s'
  }
}
