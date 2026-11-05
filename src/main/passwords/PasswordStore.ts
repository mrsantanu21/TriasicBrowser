/**
 * PasswordStore — encrypted credential storage using electron.safeStorage.
 *
 * Credentials are stored as a JSON file in app.getPath('userData').
 * Each password field is encrypted by the OS security store before persisting:
 *   - Windows: DPAPI (user-scoped)
 *   - macOS:   Keychain
 *   - Linux:   libsecret / KWallet
 *
 * The decrypted password is NEVER kept in memory longer than needed and is
 * NEVER sent to the renderer process — autofill injects directly from main.
 */
import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { Credential } from '../../shared/types'

// ─── Internal stored shape ─────────────────────────────────────────────────────
interface StoredCredential {
  id: string
  origin: string
  username: string
  /** safeStorage.encryptString() result encoded as base64 */
  encryptedPassword: string
  createdAt: number
  updatedAt: number
}

// ─── Persistence helpers ───────────────────────────────────────────────────────
const CREDS_PATH = join(app.getPath('userData'), 'credentials.json')

function readStore(): StoredCredential[] {
  if (!existsSync(CREDS_PATH)) return []
  try {
    return JSON.parse(readFileSync(CREDS_PATH, 'utf8'))
  } catch {
    return []
  }
}

function writeStore(creds: StoredCredential[]): void {
  writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save or update a credential.
 * If a credential for the same (origin, username) pair already exists,
 * it is updated in place; otherwise a new entry is created.
 * Returns the public Credential record (no password).
 */
export function saveCredential(
  origin: string,
  username: string,
  password: string,
): Credential {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available — cannot store passwords securely')
  }

  const store = readStore()
  const now = Date.now()
  const encrypted = safeStorage.encryptString(password).toString('base64')
  const existingIdx = store.findIndex(
    (c) => c.origin === origin && c.username === username,
  )

  if (existingIdx >= 0) {
    store[existingIdx].encryptedPassword = encrypted
    store[existingIdx].updatedAt = now
    const c = store[existingIdx]
    writeStore(store)
    return { id: c.id, origin, username, createdAt: c.createdAt, updatedAt: now }
  } else {
    const id = randomUUID()
    store.push({ id, origin, username, encryptedPassword: encrypted, createdAt: now, updatedAt: now })
    writeStore(store)
    return { id, origin, username, createdAt: now, updatedAt: now }
  }
}

/** Return credential stubs (no password) for the given origin hostname. */
export function getByOrigin(origin: string): Array<{ id: string; username: string }> {
  return readStore()
    .filter((c) => c.origin === origin)
    .map((c) => ({ id: c.id, username: c.username }))
}

/** List all credentials — passwords are NOT included. */
export function listAll(): Credential[] {
  return readStore().map((c) => ({
    id: c.id,
    origin: c.origin,
    username: c.username,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))
}

/**
 * Decrypt and return a single password.
 * Called only from main process (autofill, reveal in password manager page).
 * NEVER expose this over IPC without rate-limiting / auth in Phase 6.
 */
export function getPassword(id: string): string | null {
  const cred = readStore().find((c) => c.id === id)
  if (!cred) return null
  try {
    const buf = Buffer.from(cred.encryptedPassword, 'base64')
    return safeStorage.decryptString(buf)
  } catch {
    return null
  }
}

/** Delete a single credential by ID. */
export function deleteById(id: string): void {
  writeStore(readStore().filter((c) => c.id !== id))
}
