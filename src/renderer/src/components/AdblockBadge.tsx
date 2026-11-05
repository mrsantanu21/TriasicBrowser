/**
 * AdblockBadge — shield icon in the toolbar-right area.
 * Shows the number of requests blocked this session.
 * Click to toggle the ad blocker on/off.
 */
import type { AdblockStats } from '../../../shared/types'

interface Props {
  stats: AdblockStats
  onToggle: () => void
}

export default function AdblockBadge({ stats, onToggle }: Props) {
  const { isEnabled, blockedCount } = stats

  const label = isEnabled
    ? `Ad blocker ON — ${blockedCount.toLocaleString()} blocked`
    : 'Ad blocker OFF — click to enable'

  return (
    <button
      id="btn-adblock"
      className={`adblock-badge ${isEnabled ? 'adblock-badge--on' : 'adblock-badge--off'}`}
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={isEnabled}
    >
      {/* Shield SVG */}
      <svg
        className="adblock-shield"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 1.5L2 3.5v3.2C2 9.28 4.2 11.8 7 12.5c2.8-.7 5-3.22 5-5.8V3.5L7 1.5z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill={isEnabled ? 'currentColor' : 'none'}
          fillOpacity={isEnabled ? 0.18 : 0}
        />
        {isEnabled && (
          <path
            d="M5 7l1.5 1.5L9 5.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Block count — only show when enabled and non-zero */}
      {isEnabled && blockedCount > 0 && (
        <span className="adblock-count" aria-hidden="true">
          {blockedCount >= 1000
            ? `${(blockedCount / 1000).toFixed(1)}k`
            : blockedCount}
        </span>
      )}
    </button>
  )
}
