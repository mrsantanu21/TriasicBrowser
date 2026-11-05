/**
 * PasswordPopover — small toolbar popover triggered by the 🔑 key icon.
 * Lets the user save a new credential for the current site.
 * "Manage" link opens the full Password Manager view.
 */
import { useState, useRef, useEffect } from 'react'

interface Props {
  currentOrigin: string
  onSave: (username: string, password: string) => Promise<void>
  onManage: () => void
  onClose: () => void
}

export default function PasswordPopover({ currentOrigin, onSave, onManage, onClose }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Focus username on mount
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSave = async () => {
    if (!username.trim() || !password) return
    setSaving(true)
    await onSave(username.trim(), password)
    setSaved(true)
    setSaving(false)
    setTimeout(onClose, 800)
  }

  return (
    <div ref={containerRef} className="pw-popover" role="dialog" aria-label="Save password">
      <div className="pw-popover-header">
        <span className="pw-popover-title">Save password</span>
        <button className="pw-popover-close" onClick={onClose} aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="pw-popover-origin">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <circle cx="5.5" cy="5.5" r="4.25" stroke="currentColor" strokeWidth="1.1" />
          <path d="M5.5 1.25C4.5 3 4 4.2 4 5.5s.5 2.5 1.5 4.25M5.5 1.25C6.5 3 7 4.2 7 5.5S6.5 8 5.5 9.75M1.25 5.5h8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <span>{currentOrigin || 'Current site'}</span>
      </div>

      <div className="pw-popover-fields">
        <div className="pw-field">
          <label htmlFor="pw-username">Username or email</label>
          <input
            ref={usernameRef}
            id="pw-username"
            type="text"
            className="pw-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@example.com"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="pw-field">
          <label htmlFor="pw-password">Password</label>
          <div className="pw-input-wrap">
            <input
              id="pw-password"
              type={showPassword ? 'text' : 'password'}
              className="pw-input pw-input--password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="••••••••"
            />
            <button
              className="pw-reveal-btn"
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
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
        </div>
      </div>

      <div className="pw-popover-actions">
        <button className="pw-btn pw-btn--cancel" onClick={onClose}>Cancel</button>
        <button
          className={`pw-btn pw-btn--save ${saved ? 'pw-btn--saved' : ''}`}
          onClick={handleSave}
          disabled={saving || saved || !username.trim() || !password}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <button className="pw-manage-link" onClick={onManage}>
        Manage saved passwords →
      </button>
    </div>
  )
}
