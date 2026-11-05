/**
 * ScreenshotToast — brief, auto-dismissing notification after a screenshot
 * is captured.  Shows the filename and a "Reveal in folder" button.
 * Fades out after 4 seconds.
 */
import { useEffect } from 'react'

interface Props {
  savePath: string
  onDismiss: () => void
  onReveal: () => void
}

export default function ScreenshotToast({ savePath, onDismiss, onReveal }: Props) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  // Extract just the filename from the full path (cross-platform)
  const filename = savePath.replace(/.*[\\/]/, '')

  return (
    <div
      className="ss-toast"
      role="status"
      aria-live="polite"
      aria-label={`Screenshot saved: ${filename}`}
    >
      <div className="ss-toast-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12.5" cy="4.5" r="0.8" fill="currentColor" />
        </svg>
      </div>

      <div className="ss-toast-body">
        <span className="ss-toast-title">Screenshot saved</span>
        <span className="ss-toast-filename" title={savePath}>{filename}</span>
      </div>

      <div className="ss-toast-actions">
        <button
          className="ss-toast-reveal"
          onClick={onReveal}
          title="Show in folder"
        >
          Reveal
        </button>
        <button
          className="ss-toast-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
