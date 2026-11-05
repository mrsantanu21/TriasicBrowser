/**
 * AutofillBanner — slim overlay banner shown below the browser toolbar
 * when the main process detects saved credentials for the current page.
 *
 * Floats above page content (z-indexed), auto-dismisses after 8s.
 * Contains: site name, saved username, [Fill] and [Dismiss] controls.
 */
import { useEffect } from 'react'
import type { AutofillState } from '../../../shared/types'

interface Props {
  state: AutofillState
  onFill: () => void
  onDismiss: () => void
}

export default function AutofillBanner({ state, onFill, onDismiss }: Props) {
  // Auto-dismiss after 8 seconds if user doesn't interact
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="af-banner"
      role="alert"
      aria-live="polite"
      aria-label={`Autofill available for ${state.origin}`}
    >
      <span className="af-banner-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.25" y="5.5" width="11.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 5.5V3.5a3 3 0 0 1 6 0V5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="7" cy="9" r="1" fill="currentColor" />
        </svg>
      </span>

      <div className="af-banner-body">
        <span className="af-banner-site">{state.origin}</span>
        <span className="af-banner-user">{state.username}</span>
      </div>

      <div className="af-banner-actions">
        <button
          className="af-banner-fill"
          onClick={() => { onFill(); onDismiss() }}
          aria-label={`Autofill credentials for ${state.username}`}
        >
          Fill
        </button>
        <button
          className="af-banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss autofill"
        >
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
