/**
 * DownloadPanel — slide-in overlay from the bottom-right.
 * Shows active (with progress bar) and completed downloads.
 * Quick actions: open file, reveal in folder, cancel (active), clear all done.
 */
import type { DownloadItem } from '../../../shared/types'

interface Props {
  downloads: DownloadItem[]
  onClose: () => void
  onOpen: (id: string) => void
  onShowInFolder: (id: string) => void
  onCancel: (id: string) => void
  onClearCompleted: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

function DownloadRow({
  item,
  onOpen,
  onShowInFolder,
  onCancel,
}: {
  item: DownloadItem
  onOpen: (id: string) => void
  onShowInFolder: (id: string) => void
  onCancel: (id: string) => void
}) {
  const isActive = item.state === 'progressing'
  const isDone = item.state === 'completed'
  const isFailed = item.state === 'cancelled' || item.state === 'interrupted'

  const progress =
    item.totalBytes > 0
      ? Math.min(100, (item.receivedBytes / item.totalBytes) * 100)
      : 0

  return (
    <div className={`dl-row dl-row--${item.state}`}>
      {/* File icon */}
      <div className="dl-icon" aria-hidden="true">
        <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
          <path
            d="M3 2h9l4 4v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
          <path d="M12 2v5h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Info */}
      <div className="dl-info">
        <span className="dl-filename" title={item.filename}>{item.filename}</span>

        {isActive && (
          <div className="dl-progress-wrap">
            <div className="dl-progress-bar">
              <div className="dl-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="dl-meta">
              {formatBytes(item.receivedBytes)}
              {item.totalBytes > 0 && ` / ${formatBytes(item.totalBytes)}`}
              {item.speed > 0 && ` · ${formatSpeed(item.speed)}`}
            </span>
          </div>
        )}

        {isDone && (
          <span className="dl-meta dl-meta--done">
            {formatBytes(item.totalBytes)} · Completed
          </span>
        )}

        {isFailed && (
          <span className="dl-meta dl-meta--fail">
            {item.state === 'cancelled' ? 'Cancelled' : 'Failed'}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="dl-actions">
        {isActive && (
          <button
            className="dl-action-btn dl-action-btn--cancel"
            onClick={() => onCancel(item.id)}
            title="Cancel download"
            aria-label={`Cancel ${item.filename}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {isDone && (
          <>
            <button
              className="dl-action-btn"
              onClick={() => onOpen(item.id)}
              title="Open file"
              aria-label={`Open ${item.filename}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="dl-action-btn"
              onClick={() => onShowInFolder(item.id)}
              title="Show in folder"
              aria-label={`Show ${item.filename} in folder`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 3.5h3l1.5-1.5H10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function DownloadPanel({
  downloads,
  onClose,
  onOpen,
  onShowInFolder,
  onCancel,
  onClearCompleted,
}: Props) {
  const active = downloads.filter((d) => d.state === 'progressing')
  const finished = downloads.filter((d) => d.state !== 'progressing')
  const hasFinished = finished.length > 0

  return (
    <div className="dl-panel" role="dialog" aria-label="Downloads" aria-modal="false">
      {/* Header */}
      <div className="dl-header">
        <span className="dl-title">Downloads</span>
        <div className="dl-header-actions">
          {hasFinished && (
            <button
              className="dl-clear-btn"
              onClick={onClearCompleted}
              title="Clear completed"
            >
              Clear done
            </button>
          )}
          <button
            className="dl-close-btn"
            onClick={onClose}
            aria-label="Close downloads panel"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Download list */}
      <div className="dl-list">
        {downloads.length === 0 ? (
          <div className="dl-empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 6v14M10 14l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 24h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p>No downloads yet</p>
          </div>
        ) : (
          downloads.map((item) => (
            <DownloadRow
              key={item.id}
              item={item}
              onOpen={onOpen}
              onShowInFolder={onShowInFolder}
              onCancel={onCancel}
            />
          ))
        )}
      </div>
    </div>
  )
}
