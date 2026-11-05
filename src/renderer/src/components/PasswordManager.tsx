/**
 * PasswordManager — full-screen modal overlay for viewing and managing
 * all saved credentials.
 *
 * Features:
 *  - Filter by domain (live search)
 *  - Reveal password toggle per row (calls revealPassword IPC)
 *  - Delete credential per row
 *  - Keyboard: Escape closes the modal
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Credential } from '../../../shared/types'

interface Props {
  credentials: Credential[]
  onReveal: (id: string) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  onRefresh: () => Promise<void>
}

function PasswordRow({
  cred,
  onReveal,
  onDelete,
}: {
  cred: Credential
  onReveal: (id: string) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
}) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleReveal = async () => {
    if (revealed) { setRevealed(null); return }
    setRevealing(true)
    const pw = await onReveal(cred.id)
    setRevealed(pw)
    setRevealing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete saved password for ${cred.username} on ${cred.origin}?`)) return
    setDeleting(true)
    await onDelete(cred.id)
    // Parent refreshes the list
  }

  return (
    <div className={`pm-row ${deleting ? 'pm-row--deleting' : ''}`}>
      <div className="pm-cell pm-origin">
        <span className="pm-origin-dot" aria-hidden="true" />
        {cred.origin}
      </div>
      <div className="pm-cell pm-username">{cred.username}</div>
      <div className="pm-cell pm-password">
        <span className="pm-pw-value" title={revealed ?? undefined}>
          {revealed ?? '••••••••'}
        </span>
        <button
          className="pm-reveal-btn"
          onClick={handleReveal}
          disabled={revealing}
          aria-label={revealed ? 'Hide password' : 'Reveal password'}
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealing ? (
            '…'
          ) : revealed ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 6C1.5 6 3 3 6 3s4.5 3 4.5 3-1.5 3-4.5 3S1.5 6 1.5 6z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="6" cy="6" r="1.25" fill="currentColor" />
              <path d="M2 2l8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 6C1.5 6 3 3 6 3s4.5 3 4.5 3-1.5 3-4.5 3S1.5 6 1.5 6z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="6" cy="6" r="1.25" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <div className="pm-cell pm-actions">
        <button
          className="pm-delete-btn"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete password for ${cred.username}`}
          title="Delete"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function PasswordManager({ credentials, onReveal, onDelete, onClose, onRefresh }: Props) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Keyboard: Escape closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus search on open
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  const filtered = query.trim()
    ? credentials.filter(
        (c) =>
          c.origin.toLowerCase().includes(query.toLowerCase()) ||
          c.username.toLowerCase().includes(query.toLowerCase()),
      )
    : credentials

  const handleDelete = useCallback(
    async (id: string) => {
      await onDelete(id)
      await onRefresh()
    },
    [onDelete, onRefresh],
  )

  return (
    <div className="pm-overlay" role="dialog" aria-modal="true" aria-label="Password Manager">
      <div className="pm-modal">
        {/* Header */}
        <div className="pm-header">
          <div className="pm-header-left">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1.5" y="6.5" width="13" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4.5 6.5V4a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="8" cy="10.5" r="1.25" fill="currentColor" />
            </svg>
            <span className="pm-header-title">Saved Passwords</span>
            <span className="pm-count">{credentials.length}</span>
          </div>
          <button className="pm-close-btn" onClick={onClose} aria-label="Close password manager">
            <svg width="11" height="11" viewBox="0 0 11 11">
              <path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="pm-search-wrap">
          <svg className="pm-search-icon" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8.5 8.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            className="pm-search"
            type="text"
            placeholder="Search by site or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter passwords"
          />
          {query && (
            <button className="pm-search-clear" onClick={() => setQuery('')} aria-label="Clear search" tabIndex={-1}>
              <svg width="9" height="9" viewBox="0 0 9 9">
                <path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Column headers */}
        {filtered.length > 0 && (
          <div className="pm-col-headers">
            <span className="pm-col-header">Site</span>
            <span className="pm-col-header">Username</span>
            <span className="pm-col-header">Password</span>
            <span className="pm-col-header" />
          </div>
        )}

        {/* Credentials list */}
        <div className="pm-list">
          {filtered.length === 0 ? (
            <div className="pm-empty">
              {credentials.length === 0 ? (
                <>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect x="4" y="17" width="32" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
                    <path d="M11 17V11a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="20" cy="27" r="2.5" fill="currentColor" />
                  </svg>
                  <p>No saved passwords yet</p>
                  <span>Click the 🔑 icon in the toolbar to save your first password.</span>
                </>
              ) : (
                <p>No matches for "{query}"</p>
              )}
            </div>
          ) : (
            filtered.map((cred) => (
              <PasswordRow
                key={cred.id}
                cred={cred}
                onReveal={onReveal}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
