/**
 * ExtensionManager — loads/unloads unpacked Chrome extensions via the
 * Electron session API.  Persists loaded extension paths to userData so
 * they are automatically reloaded on next startup.
 *
 * Limitations (Electron 31):
 *   - Only MV2 extensions are fully supported
 *   - Some Chrome APIs are unavailable (e.g., chrome.tabs, chrome.windows)
 *   - Content scripts work; browser action popups work
 */
import { session, app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { ExtensionInfo } from '../../shared/types'

const EXTENSIONS_JSON = join(app.getPath('userData'), 'extensions.json')

// ─── Stored extension record ───────────────────────────────────────────────────
interface StoredExtension {
  /** Electron-assigned extension ID (stable within a session partition) */
  id: string
  path: string
}

// ─── Persistence helpers ───────────────────────────────────────────────────────
function readStored(): StoredExtension[] {
  if (!existsSync(EXTENSIONS_JSON)) return []
  try {
    return JSON.parse(readFileSync(EXTENSIONS_JSON, 'utf8'))
  } catch {
    return []
  }
}

function writeStored(exts: StoredExtension[]): void {
  writeFileSync(EXTENSIONS_JSON, JSON.stringify(exts, null, 2))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load an unpacked extension from a local directory and persist its path. */
export async function loadExtension(extPath: string): Promise<ExtensionInfo> {
  const ext = await session.defaultSession.loadExtension(extPath, {
    allowFileAccess: true,
  })

  const stored = readStored()
  if (!stored.find((e) => e.id === ext.id)) {
    stored.push({ id: ext.id, path: extPath })
    writeStored(stored)
  }

  return {
    id: ext.id,
    name: ext.name,
    version: (ext.manifest.version as string) ?? '0.0.0',
    path: extPath,
  }
}

/** Return all currently loaded extensions with their on-disk paths. */
export function getLoadedExtensions(): ExtensionInfo[] {
  const stored = readStored()
  return session.defaultSession.getAllExtensions().map((ext) => {
    const entry = stored.find((e) => e.id === ext.id)
    return {
      id: ext.id,
      name: ext.name,
      version: (ext.manifest.version as string) ?? '0.0.0',
      path: entry?.path ?? '',
    }
  })
}

/** Unload an extension by its Electron ID and remove it from persistence. */
export async function removeExtension(id: string): Promise<void> {
  const entry = readStored().find((e) => e.id === id)
  try {
    await session.defaultSession.removeExtension(id)
  } catch (err) {
    console.error('[ExtensionManager] Failed to remove extension:', err)
  }
  if (entry) {
    writeStored(readStored().filter((e) => e.id !== id))
  }
}

/**
 * Reload all persisted extensions on startup.
 * Extensions that have been deleted from disk are silently skipped (their
 * stored entries are pruned from the JSON file).
 */
export async function reloadPersistedExtensions(): Promise<void> {
  const stored = readStored()
  const valid: StoredExtension[] = []

  for (const entry of stored) {
    try {
      const ext = await session.defaultSession.loadExtension(entry.path, {
        allowFileAccess: true,
      })
      valid.push({ id: ext.id, path: entry.path })
      console.log(`[ExtensionManager] Reloaded: ${ext.name} (${entry.path})`)
    } catch {
      console.warn(`[ExtensionManager] Skipping missing extension: ${entry.path}`)
    }
  }

  // Prune deleted extensions from storage
  if (valid.length !== stored.length) {
    writeStored(valid)
  }
}
