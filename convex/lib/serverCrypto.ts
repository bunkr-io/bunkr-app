// Server-side ECIES encryption using pure-JS @noble/* libraries.
// Convex's default runtime does not support crypto.subtle for X25519, HKDF,
// or AES-GCM, so we use @noble/curves, @noble/hashes, and @noble/ciphers.
// Only import this from actions/httpActions — NOT from queries/mutations

import { gcm } from '@noble/ciphers/aes.js'
import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha256.js'

const CURRENT_PAYLOAD_VERSION = 1

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function buildHkdfInfo(context: string, fieldGroup?: string): string {
  const parts = ['bunkr-v1', context]
  if (fieldGroup) parts.push(fieldGroup)
  return parts.join('|')
}

function buildAad(
  version: number,
  epkBase64: string,
  context: string,
): Uint8Array {
  return new TextEncoder().encode(`${version}|${epkBase64}|${context}`)
}

async function eciesEncrypt(
  plaintext: Uint8Array,
  publicKeyJwk: string,
  context: string,
  fieldGroup?: string,
): Promise<string> {
  // Extract raw public key bytes from JWK
  const jwk = JSON.parse(publicKeyJwk) as { x: string }
  const recipientPubBytes = base64urlToBytes(jwk.x)

  // Generate ephemeral X25519 keypair
  const ephemeralPrivateKey = x25519.utils.randomSecretKey()
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey)

  const epkBase64 = toBase64(ephemeralPublicKey)

  // ECDH → shared secret
  const sharedSecret = x25519.getSharedSecret(
    ephemeralPrivateKey,
    recipientPubBytes,
  )

  // HKDF → AES key (32 bytes for AES-256)
  const info = buildHkdfInfo(context, fieldGroup)
  const aesKeyBytes = hkdf(
    sha256,
    sharedSecret,
    ephemeralPublicKey,
    new TextEncoder().encode(info),
    32,
  )

  // AES-GCM encrypt with AAD
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aad = buildAad(1, epkBase64, context)
  const cipher = gcm(aesKeyBytes, iv, aad)
  const ct = cipher.encrypt(plaintext)

  return JSON.stringify({
    ct: toBase64(ct),
    epk: epkBase64,
    iv: toBase64(iv),
    v: 1,
  })
}

export async function encryptForProfile(
  data: Record<string, unknown>,
  publicKeyJwk: string,
  context: string,
  fieldGroup?: string,
): Promise<string> {
  const payload = { _v: CURRENT_PAYLOAD_VERSION, ...data }
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  return eciesEncrypt(plaintext, publicKeyJwk, context, fieldGroup)
}

export async function encryptFieldGroups(
  groups: Record<string, Record<string, unknown>>,
  publicKeyJwk: string,
  recordId: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const [groupName, fields] of Object.entries(groups)) {
    result[groupName] = await encryptForProfile(
      fields,
      publicKeyJwk,
      recordId,
      groupName,
    )
  }
  return result
}

// --- ECIES decryption (reverse of encryption above) ---

function fromBase64(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64url(bytes: Uint8Array): string {
  const b64 = toBase64(bytes)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function eciesDecrypt(
  encryptedStr: string,
  privateKeyBytes: Uint8Array,
  context: string,
  fieldGroup?: string,
): Promise<Uint8Array> {
  const envelope = JSON.parse(encryptedStr) as {
    ct: string
    epk: string
    iv: string
    v?: number
  }

  const ctBytes = fromBase64(envelope.ct)
  const epkBytes = fromBase64(envelope.epk)
  const ivBytes = fromBase64(envelope.iv)

  // ECDH → shared secret (using our private key + ephemeral public key)
  const sharedSecret = x25519.getSharedSecret(privateKeyBytes, epkBytes)

  // HKDF → AES key (salt = ephemeral public key, info = context)
  const info = buildHkdfInfo(context, fieldGroup)
  const aesKeyBytes = hkdf(
    sha256,
    sharedSecret,
    epkBytes,
    new TextEncoder().encode(info),
    32,
  )

  // AES-GCM decrypt with AAD
  const aad = buildAad(envelope.v ?? 1, envelope.epk, context)
  const cipher = gcm(aesKeyBytes, ivBytes, aad)
  return cipher.decrypt(ctBytes)
}

export async function decryptForProfile(
  encryptedStr: string,
  privateKeyBytes: Uint8Array,
  context: string,
  fieldGroup?: string,
): Promise<Record<string, unknown>> {
  const plaintext = await eciesDecrypt(
    encryptedStr,
    privateKeyBytes,
    context,
    fieldGroup,
  )
  const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as Record<
    string,
    unknown
  >
  delete parsed._v
  return parsed
}

export async function decryptFieldGroups(
  groups: Record<string, string | undefined>,
  privateKeyBytes: Uint8Array,
  recordId: string,
): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {}
  for (const [groupName, encryptedStr] of Object.entries(groups)) {
    if (!encryptedStr) continue
    const data = await decryptForProfile(
      encryptedStr,
      privateKeyBytes,
      recordId,
      groupName,
    )
    Object.assign(merged, data)
  }
  return merged
}

/**
 * Decrypt a key slot (workspace private key encrypted with recipient's public key).
 * Uses different HKDF/AAD pattern from record data:
 * - HKDF info: "bunkr-v1|keyslot"
 * - AAD: "keyslot|{epk}"
 * - No version field in envelope
 */
export async function decryptKeySlot(
  encryptedStr: string,
  privateKeyBytes: Uint8Array,
): Promise<string> {
  const envelope = JSON.parse(encryptedStr) as {
    ct: string
    epk: string
    iv: string
  }

  const ctBytes = fromBase64(envelope.ct)
  const epkBytes = fromBase64(envelope.epk)
  const ivBytes = fromBase64(envelope.iv)

  // ECDH → shared secret
  const sharedSecret = x25519.getSharedSecret(privateKeyBytes, epkBytes)

  // HKDF → AES key (key slot uses info = "bunkr-v1|keyslot")
  const info = buildHkdfInfo('keyslot')
  const aesKeyBytes = hkdf(
    sha256,
    sharedSecret,
    epkBytes,
    new TextEncoder().encode(info),
    32,
  )

  // AES-GCM decrypt with key slot AAD pattern: "keyslot|{epk}"
  const aad = new TextEncoder().encode(`keyslot|${envelope.epk}`)
  const cipher = gcm(aesKeyBytes, ivBytes, aad)
  const plaintext = cipher.decrypt(ctBytes)
  return new TextDecoder().decode(plaintext)
}

// --- Agent keypair management ---

export function generateAgentKeyPair(): {
  publicKeyJwk: string
  privateKeyBytes: Uint8Array
} {
  const privateKeyBytes = x25519.utils.randomSecretKey()
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes)

  // Format as JWK matching Web Crypto's output
  const publicKeyJwk = JSON.stringify({
    kty: 'OKP',
    crv: 'X25519',
    x: bytesToBase64url(publicKeyBytes),
  })

  return { publicKeyJwk, privateKeyBytes }
}

/**
 * Encrypt the agent's raw private key for storage at rest.
 * Uses HKDF(SHA-256, secret, salt, info) → AES-256-GCM with AAD bound to the agent's public key.
 * A random 32-byte salt ensures each encryption produces a unique AES key even with the same secret.
 */
export function encryptAgentPrivateKey(
  privateKeyBytes: Uint8Array,
  secretHex: string,
  agentPublicKeyJwk: string,
): string {
  const secretBytes = new TextEncoder().encode(secretHex)
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const info = new TextEncoder().encode('bunkr-agent-key-v1')
  const aesKey = hkdf(sha256, secretBytes, salt, info, 32)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  // AAD binds the ciphertext to this specific agent public key
  const aad = new TextEncoder().encode(agentPublicKeyJwk)
  const cipher = gcm(aesKey, iv, aad)
  const ct = cipher.encrypt(privateKeyBytes)
  return JSON.stringify({
    ct: toBase64(ct),
    iv: toBase64(iv),
    salt: toBase64(salt),
    v: 1,
  })
}

export function decryptAgentPrivateKey(
  encrypted: string,
  secretHex: string,
  agentPublicKeyJwk: string,
): Uint8Array {
  const { ct, iv, salt } = JSON.parse(encrypted) as {
    ct: string
    iv: string
    salt: string
  }
  const secretBytes = new TextEncoder().encode(secretHex)
  const info = new TextEncoder().encode('bunkr-agent-key-v1')
  const aesKey = hkdf(sha256, secretBytes, fromBase64(salt), info, 32)
  const aad = new TextEncoder().encode(agentPublicKeyJwk)
  const cipher = gcm(aesKey, fromBase64(iv), aad)
  return cipher.decrypt(fromBase64(ct))
}

/**
 * Extract raw X25519 private key bytes from a JWK string.
 * JWK for X25519 has a "d" field (base64url-encoded 32 bytes).
 */
export function jwkToPrivateKeyBytes(jwkStr: string): Uint8Array {
  const jwk = JSON.parse(jwkStr) as { d: string }
  return base64urlToBytes(jwk.d)
}
