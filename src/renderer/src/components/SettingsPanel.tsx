import { useState, useEffect } from 'react'
import type { BrowserSettings } from '../../../shared/types'

interface SettingsPanelProps {
  onClose: () => void
  onSettingsChanged?: (settings: BrowserSettings) => void
}

export default function SettingsPanel({ onClose, onSettingsChanged }: SettingsPanelProps) {
  const [settings, setSettings] = useState<BrowserSettings>({
    homepageUrl: 'https://www.google.com',
    searchEngine: 'google',
    theme: 'dark',
    accentColor: '#a855f7',
    showBookmarksBar: false,
    blockAds: true,
    restoreOnLaunch: true,
  })

  useEffect(() => {
    if (window.triasicBridge?.getSettings) {
      window.triasicBridge.getSettings().then(setSettings)
    }
  }, [])

  const handleChange = async (key: keyof BrowserSettings, value: any) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    if (window.triasicBridge?.updateSettings) {
      const saved = await window.triasicBridge.updateSettings({ [key]: value })
      if (onSettingsChanged) onSettingsChanged(saved)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body settings-body">
          <div className="settings-group">
            <label className="settings-label" htmlFor="search-engine-select">
              Search Engine
            </label>
            <p className="settings-desc">Select default search engine for address bar queries</p>
            <select
              id="search-engine-select"
              className="settings-select"
              value={settings.searchEngine}
              onChange={(e) => handleChange('searchEngine', e.target.value as any)}
            >
              <option value="google">Google (https://www.google.com/search?q=%s)</option>
              <option value="duckduckgo">DuckDuckGo (https://duckduckgo.com/?q=%s)</option>
              <option value="bing">Bing (https://www.bing.com/search?q=%s)</option>
              <option value="brave">Brave (https://search.brave.com/search?q=%s)</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label" htmlFor="homepage-url-input">
              Homepage URL
            </label>
            <input
              id="homepage-url-input"
              type="text"
              className="settings-input"
              value={settings.homepageUrl}
              onChange={(e) => handleChange('homepageUrl', e.target.value)}
              placeholder="https://www.google.com"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
