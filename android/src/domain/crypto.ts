export interface DerivedCredentials {
  authHash: string;
  encryptionKey: CryptoKey;
}

/**
 * Derives Auth Hash for server login and AES-GCM Encryption Key for local vault operations.
 * Must match the web app deriveKeys algorithm 1:1.
 */
export async function deriveKeys(password: string, email: string): Promise<DerivedCredentials> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const cryptoObj = globalThis.crypto;

  // 1. Import raw password as PBKDF2 base key
  const baseKey = await cryptoObj.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // 2. Derive 256-bit Stretched Master Key (100,000 iterations, SHA-256, salt: email)
  const emailSalt = encoder.encode(email.toLowerCase().trim());
  const masterKeyBytes = await cryptoObj.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: emailSalt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    256
  );

  // 3. Import master key bytes as base key for sub-derivations
  const masterBaseKey = await cryptoObj.subtle.importKey(
    "raw",
    masterKeyBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // 4. Derive 256-bit Authentication Hash (1 iteration, SHA-256, salt: "auth-key-salt")
  const authSalt = encoder.encode("auth-key-salt");
  const authHashBytes = await cryptoObj.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: authSalt,
      iterations: 1,
      hash: "SHA-256",
    },
    masterBaseKey,
    256
  );

  const authHash = Array.from(new Uint8Array(authHashBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 5. Derive 256-bit AES-GCM Encryption Key (1 iteration, SHA-256, salt: "encryption-key-salt")
  const encryptionSalt = encoder.encode("encryption-key-salt");
  const encryptionKey = await cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encryptionSalt,
      iterations: 1,
      hash: "SHA-256",
    },
    masterBaseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return { authHash, encryptionKey };
}

/**
 * Encrypts plaintext string using AES-GCM 256-bit with random 12-byte IV.
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const ivArray = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivArray },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(ivArray.buffer),
  };
}

/**
 * Decrypts AES-GCM ciphertext using derived CryptoKey and Base64 IV.
 */
export async function decryptData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
    key,
    ciphertextBuffer
  );

  return decoder.decode(decryptedBuffer);
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
