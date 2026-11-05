/**
 * ExtensionsPanel — slide-in overlay (like DownloadPanel) for managing
 * loaded unpacked Chrome extensions.
 *
 * Actions:
 *  - Load Extension → opens OS folder picker → loads extension
 *  - Remove → unloads and forgets an extension
 */
import { useState } from 'react'
import type { ExtensionInfo } from '../../../shared/types'

interface Props {
  extensions: ExtensionInfo[]
  onClose: () => void
  onLoad: () => Promise<ExtensionInfo | null>
  onRemove: (id: string) => Promise<void>
}

function ExtensionRow({
  ext,
  onRemove,
}: {
  ext: ExtensionInfo
  onRemove: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    setRemoving(true)
    await onRemove(ext.id)
    // Parent re-renders with updated list after IPC resolves
  }

  return (
    <div className="ext-row">
      <div className="ext-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M8 2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M14 10h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M10 2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M2 10v2a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="ext-info">
        <span className="ext-name">{ext.name}</span>
        <span className="ext-version">v{ext.version}</span>
      </div>
      <button
        className="ext-remove-btn"
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Remove ${ext.name}`}
        title="Remove extension"
      >
        {removing ? (
          <span className="ext-removing">…</span>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function ExtensionsPanel({ extensions, onClose, onLoad, onRemove }: Props) {
  const [loading, setLoading] = useState(false)

  const handleLoad = async () => {
    setLoading(true)
    await onLoad()
    setLoading(false)
  }

  return (
    <div className="ext-panel" role="dialog" aria-label="Extensions" aria-modal="false">
      {/* Header */}
      <div className="ext-header">
        <span className="ext-title">Extensions</span>
        <div className="ext-header-actions">
          <button
            className="ext-load-btn"
            onClick={handleLoad}
            disabled={loading}
            title="Load unpacked extension"
          >
            {loading ? 'Loading…' : '+ Load'}
          </button>
          <button
            className="ext-close-btn"
            onClick={onClose}
            aria-label="Close extensions panel"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Extension list */}
      <div className="ext-list">
        {extensions.length === 0 ? (
          <div className="ext-empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <rect x="17" y="17" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <path d="M17 4h5a2 2 0 0 1 2 2v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M4 17v5a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <p>No extensions loaded</p>
            <button className="ext-empty-load-btn" onClick={handleLoad} disabled={loading}>
              Load unpacked extension
            </button>
          </div>
        ) : (
          extensions.map((ext) => (
            <ExtensionRow key={ext.id} ext={ext} onRemove={onRemove} />
          ))
        )}
      </div>

      {/* Footer note */}
      {extensions.length > 0 && (
        <div className="ext-footer">
          <span>Extensions reload automatically on next launch</span>
        </div>
      )}
    </div>
  )
}
