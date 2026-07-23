/**
 * Cryptographic utility functions for Zero-Knowledge End-to-End Encryption
 * utilizing the browser's native Web Crypto API.
 */

export interface DerivedCredentials {
  authHash: string;
  encryptionKey: CryptoKey;
}

// Environment-agnostic Web Crypto retriever supporting browser runtimes and Node/Vitest test runs
const getCrypto = (): Crypto => {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto as Crypto;
  }
  throw new Error("Web Crypto API is not supported in this environment.");
};

/**
 * Derives a secure authentication hash (for login) and an encryption key (for local crypt operations)
 * from the user's password and email (used as salt).
 */
export async function deriveKeys(password: string, email: string): Promise<DerivedCredentials> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const crypto = getCrypto();

  // 1. Import raw password as a PBKDF2 base key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"] // Only need deriveBits to stretch the password
  );

  // 2. Derive the 256-bit Stretched Master Key (100,000 iterations, SHA-256)
  const emailSalt = encoder.encode(email);
  const masterKeyBytes = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: emailSalt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    256 // 256 bits = 32 bytes
  );

  // 3. Import the raw master key bytes as base key for subsequent derivations
  const masterBaseKey = await crypto.subtle.importKey(
    "raw",
    masterKeyBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // 4. Derive the 256-bit Authentication Hash (1 iteration, SHA-256, salt: "auth-key-salt")
  const authSalt = encoder.encode("auth-key-salt");
  const authHashBytes = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: authSalt,
      iterations: 1,
      hash: "SHA-256",
    },
    masterBaseKey,
    256 // 256 bits = 32 bytes
  );

  // Convert authHash to a Hex String
  const authHash = Array.from(new Uint8Array(authHashBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 5. Derive the 256-bit AES-GCM Encryption Key (1 iteration, SHA-256, salt: "encryption-key-salt")
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("encryption-key-salt"),
      iterations: 1,
      hash: "SHA-256",
    },
    masterBaseKey,
    { name: "AES-GCM", length: 256 },
    true, // Extractable so key can be restored during tab session navigation
    ["encrypt", "decrypt"]
  );

  return {
    authHash,
    encryptionKey,
  };
}

/**
 * Exports a CryptoKey to a Base64 string for tab session storage.
 */
export async function exportEncryptionKey(key: CryptoKey): Promise<string> {
  const crypto = getCrypto();
  const rawBytes = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(rawBytes)));
}

/**
 * Imports a Base64 string back into an AES-256-GCM CryptoKey.
 */
export async function importEncryptionKey(base64Key: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  const rawBytes = new Uint8Array(
    atob(base64Key)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  return crypto.subtle.importKey(
    "raw",
    rawBytes,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns the Base64-encoded ciphertext and Base64-encoded IV.
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);
  const crypto = getCrypto();

  // Generate a random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Perform AES-GCM encryption
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedPlaintext
  );

  // Convert to Base64 strings for transportation
  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    ciphertext,
    iv: ivBase64,
  };
}

/**
 * Decrypts a Base64-encoded AES-256-GCM ciphertext using the key and Base64-encoded IV.
 */
export async function decryptData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const crypto = getCrypto();

  // Decode Base64 strings back to Uint8Arrays
  const ciphertext = new Uint8Array(
    atob(ciphertextBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const iv = new Uint8Array(
    atob(ivBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Perform decryption
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
