# KeyVault Frontend - React Client

This directory contains the user interface client for KeyVault. It is a single-page application built with **React**, **TypeScript**, and **Vite**.

---

## 🔒 Security Architecture (Client-Side)

All cryptographic operations happen client-side using the browser's native **Web Crypto API**:
- **Key Derivation**: Performs PBKDF2 stretching (100,000 iterations, SHA-256) on your master password + email salt to derive the symmetric key.
- **AES-GCM-256 Encryption**: Encrypts and decrypts secret payload arrays in memory, ensuring that plaintext data is never exposed to the network stack.
- **Inactivity Purge**: Clears active encryption keys from memory if the tab is inactive for **15 minutes** or is reloaded/closed.

---

## 🛠 Prerequisites & Local Run

### 1. Configure Environment variables
Ensure you have a `.env` file in this directory:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_DEFAULT_ADMIN_EMAIL=admin@keyvault.local
VITE_DEFAULT_ADMIN_PASSWORD=adminpassword123
```
*(Note: Change `VITE_API_BASE_URL` to `/api` if testing in a proxy/Docker context.)*

### 2. Install & Launch
Run the following commands:

```bash
# Install dependencies
pnpm install

# Start Vite dev server locally
pnpm dev
```

The application will launch on `http://localhost:5173`.

---

## 🧪 E2E Verification & BDD Tests
End-to-End tests are implemented using **Playwright** and **Cucumber Gherkin**. 
Refer to [e2e-tests/README.md](../e2e-tests/README.md) for full execution and HTML report documentation.
