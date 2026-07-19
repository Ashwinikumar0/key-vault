import { describe, it, expect } from "vitest";
import { deriveKeys, encryptData, decryptData } from "./cryptoUtils";

describe("Cryptography Utility Suite (Zero-Knowledge Web Crypto API)", () => {
  const testPassword = "superSecureMasterPassword123!";
  const testEmail = "developer@keyvault.local";
  const testPlaintext = JSON.stringify({
    itemType: "connection",
    fields: [
      { name: "Connection URI", value: "postgresql://postgres:pass@localhost:5432/db", type: "secret" },
      { name: "DB Host", value: "localhost", type: "plaintext" }
    ]
  });

  it("Scenario: Derives deterministic keys from master password and email salt", async () => {
    // Given the same password and email salt inputs
    // When deriving keys twice
    const keysRun1 = await deriveKeys(testPassword, testEmail);
    const keysRun2 = await deriveKeys(testPassword, testEmail);

    // Then:
    // 1. Auth Hash must be deterministic (identical output)
    expect(keysRun1.authHash).toBe(keysRun2.authHash);
    expect(keysRun1.authHash.length).toBe(64); // SHA-256 Hex length

    // 2. Encryption Keys must be generated and valid
    expect(keysRun1.encryptionKey).toBeInstanceOf(CryptoKey);
    expect(keysRun1.encryptionKey.algorithm.name).toBe("AES-GCM");
    expect(keysRun1.encryptionKey.usages).toContain("encrypt");
    expect(keysRun1.encryptionKey.usages).toContain("decrypt");
  });

  it("Scenario: Encrypts and decrypts connection strings successfully", async () => {
    // Given derived key and plaintext payload
    const { encryptionKey } = await deriveKeys(testPassword, testEmail);

    // When encrypting the plaintext connection data
    const { ciphertext, iv } = await encryptData(testPlaintext, encryptionKey);

    // Then:
    // 1. Ciphertext and IV must be generated as non-empty strings
    expect(ciphertext).toBeTypeOf("string");
    expect(iv).toBeTypeOf("string");
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(iv.length).toBeGreaterThan(0);

    // When decrypting with the same key
    const decryptedText = await decryptData(ciphertext, iv, encryptionKey);

    // Then:
    // 2. The output must exactly match the original plaintext string
    expect(decryptedText).toBe(testPlaintext);
  });

  it("Scenario: Fails decryption when using an incorrect derived key", async () => {
    // Given:
    // 1. Correct key encryption
    const { encryptionKey: correctKey } = await deriveKeys(testPassword, testEmail);
    const { ciphertext, iv } = await encryptData(testPlaintext, correctKey);

    // 2. Incorrect key derivation (using a different password)
    const { encryptionKey: incorrectKey } = await deriveKeys("wrongPassword999", testEmail);

    // When attempting to decrypt with the incorrect key
    // Then it must throw an error, preventing compromised reads
    await expect(decryptData(ciphertext, iv, incorrectKey)).rejects.toThrow();
  });

  it("Scenario: Fails decryption when the Initialization Vector (IV) is tampered with", async () => {
    // Given:
    // 1. Correct key encryption
    const { encryptionKey } = await deriveKeys(testPassword, testEmail);
    const { ciphertext, iv } = await encryptData(testPlaintext, encryptionKey);

    // 2. A corrupted/altered IV string
    const alteredIv = iv.substring(0, iv.length - 2) + "AA";

    // When attempting to decrypt with the altered IV
    // Then it must throw a decryption/authenticator tag failure error
    await expect(decryptData(ciphertext, alteredIv, encryptionKey)).rejects.toThrow();
  });
});
