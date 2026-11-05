/**
 * AutofillManager — detects saved credentials for the current page and
 * injects them into login forms via webContents.executeJavaScript().
 *
 * Architecture:
 *  - setupAutofillForContext(ctx) hooks into 'did-navigate' events on the
 *    WebContentsView.  On each navigation, the origin hostname is matched
 *    against the PasswordStore.  If a match exists, the window renderer is
 *    notified via 'autofill:available' IPC (only sends public metadata —
 *    never the password).
 *  - performAutofill(ctx, credentialId) decrypts the password in main and
 *    injects it directly into the page via executeJavaScript.
 *
 * Security note:
 *  The password string is briefly embedded in the injected script text.
 *  This is an accepted v1 trade-off; Phase 6 should use a preload-based
 *  channel that avoids embedding secrets in script strings.
 *
 *  Incognito windows are intentionally skipped (ctx.isIncognito check).
 */
import { getByOrigin, listAll, getPassword } from '../passwords/PasswordStore'
import type { WindowContext } from '../windows/WindowManager'

/** Attach a 'did-navigate' listener that fires 'autofill:available' when credentials exist. */
export function setupAutofillForContext(ctx: WindowContext): void {
  // Privacy guard: never autofill in incognito
  if (ctx.isIncognito) return

  ctx.pageView.webContents.on('did-navigate', () => {
    try {
      const rawUrl = ctx.pageView.webContents.getURL()
      if (
        !rawUrl ||
        rawUrl.startsWith('about:') ||
        rawUrl.startsWith('file:') ||
        rawUrl.startsWith('chrome:')
      ) {
        return
      }

      const origin = new URL(rawUrl).hostname
      const matches = getByOrigin(origin)

      if (matches.length > 0 && !ctx.win.isDestroyed()) {
        ctx.win.webContents.send('autofill:available', {
          origin,
          credentialId: matches[0].id,
          username: matches[0].username,
        })
      }
    } catch {
      // Silently ignore malformed URLs
    }
  })
}

/**
 * Fill the first login form found on the page with the stored credential.
 * Returns true if at least one field was filled, false otherwise.
 */
export async function performAutofill(
  ctx: WindowContext,
  credentialId: string,
): Promise<boolean> {
  const allCreds = listAll()
  const cred = allCreds.find((c) => c.id === credentialId)
  if (!cred) return false

  const password = getPassword(credentialId)
  if (!password) return false

  try {
    const filledCount = await ctx.pageView.webContents.executeJavaScript(`
      (function() {
        // React/Vue-compatible setter that triggers the synthetic event system
        function setNativeValue(el, value) {
          const desc = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          );
          if (desc && desc.set) {
            desc.set.call(el, value);
          } else {
            el.value = value;
          }
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const username = ${JSON.stringify(cred.username)};
        const password = ${JSON.stringify(password)};

        // Username field heuristics (ordered by specificity)
        const userSelectors = [
          'input[autocomplete="username"]',
          'input[autocomplete="email"]',
          'input[type="email"]',
          'input[name*="user"]',
          'input[name*="email"]',
          'input[name*="login"]',
          'input[id*="user"]',
          'input[id*="email"]',
          'input[type="text"]',
        ];

        let filled = 0;
        for (const sel of userSelectors) {
          const el = document.querySelector(sel);
          if (el) { setNativeValue(el, username); filled++; break; }
        }

        const passEl = document.querySelector('input[type="password"]');
        if (passEl) { setNativeValue(passEl, password); filled++; }

        return filled;
      })()
    `)
    return (filledCount as number) > 0
  } catch (err) {
    console.error('[AutofillManager] Failed to inject credentials:', err)
    return false
  }
}
