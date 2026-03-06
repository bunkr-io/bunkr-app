// Client-side cryptographic utilities for zero-knowledge encryption
// Uses Web Crypto API (available in all modern browsers)

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(str: string): ArrayBuffer {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

const PBKDF2_ITERATIONS = 600_000

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return JSON.stringify(jwk)
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return JSON.stringify(jwk)
}

export async function importPublicKey(jwkStr: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwkStr),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  )
}

export async function importPrivateKey(jwkStr: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwkStr),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt'],
  )
}

export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptPrivateKey(
  privateKeyJwk: string,
  passphraseKey: CryptoKey,
): Promise<{ ct: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    passphraseKey,
    new TextEncoder().encode(privateKeyJwk),
  )
  return { ct: toBase64(ct), iv: toBase64(iv.buffer as ArrayBuffer) }
}

export async function decryptPrivateKey(
  encrypted: { ct: string; iv: string },
  passphraseKey: CryptoKey,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(encrypted.iv) },
    passphraseKey,
    fromBase64(encrypted.ct),
  )
  return new TextDecoder().decode(decrypted)
}

// Envelope encryption: AES-GCM data key wrapped with RSA-OAEP public key
export async function encryptData(
  data: Record<string, unknown>,
  publicKey: CryptoKey,
): Promise<string> {
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    new TextEncoder().encode(JSON.stringify(data)),
  )
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey)
  const ek = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawAesKey,
  )
  return JSON.stringify({
    ct: toBase64(ct),
    ek: toBase64(ek),
    iv: toBase64(iv.buffer as ArrayBuffer),
    v: 1,
  })
}

export async function decryptData(
  encryptedStr: string,
  privateKey: CryptoKey,
): Promise<Record<string, unknown>> {
  const { ct, ek, iv } = JSON.parse(encryptedStr) as {
    ct: string
    ek: string
    iv: string
  }
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    fromBase64(ek),
  )
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    aesKey,
    fromBase64(ct),
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}

// localStorage persistence for the decrypted private key
const PRIVATE_KEY_STORAGE_KEY = 'aurum-private-key'

export function getStoredPrivateKey(): string | null {
  try {
    return localStorage.getItem(PRIVATE_KEY_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storePrivateKey(jwk: string): void {
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, jwk)
}

export function clearStoredPrivateKey(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY)
}
