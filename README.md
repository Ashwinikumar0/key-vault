# KeyVault - Zero-Knowledge E2E Encrypted Key Manager

KeyVault is a production-grade, zero-knowledge, end-to-end encrypted key and credential manager. It is designed to securely store project settings and secret variables, ensuring that **only you** can read your keys. The backend database server never receives or holds your master password, decryption keys, or unencrypted data.

---

## 🔒 Security Architecture

### 1. Cryptographic Key Derivation Flow

When you log in, KeyVault uses client-side PBKDF2 stretching (Web Crypto API on Web / Expo Crypto on Mobile):

```
[ Master Password ] + [ Email as Salt ]
         │
         ▼ (100,000 iterations PBKDF2 SHA-256)
[ Stretched Master Key ]
         │
         ├──► (1 iteration PBKDF2, salt: "auth-key-salt") ────► [ Auth Hash ] ──► (sent to server/local db)
         │
         └──► (1 iteration PBKDF2, salt: "encryption-key-salt") ──► [ Local AES-256-GCM Key ] (stays in client memory)
```

1. **Auth Hash**: Sent to the server or embedded database for session verification. The auth engine hashes this with `bcrypt` before storing it.
2. **Local AES-256-GCM Key**: Marked as non-extractable. It remains strictly in-memory inside client React state. If the user closes the app, refreshes, or remains inactive for **15 minutes**, this key is purged, protecting against memory inspection attacks.

### 2. Zero-Knowledge Dynamic Custom Fields

When storing credentials:

- Secrets can consist of multiple dynamic fields (e.g. usernames, passwords, API tokens, or plaintext notes).
- The list of fields is formatted as a JSON array on the client:
  ```typescript
  interface CustomField {
    name: string;
    value: string;
    type: "secret" | "plaintext";
  }
  ```
- The entire JSON structure (`JSON.stringify(fields)`) is encrypted on the client using **AES-256-GCM** with a random 12-byte Initialization Vector (IV).
- The database only receives item names, ciphertext, and IVs. Field names, values, and types are completely hidden from database administrators.

### 3. Zero-Knowledge Decrypted Export & Local Import

KeyVault supports exporting and importing your secrets database as structured JSON documents. All processing is executed client-side, preserving the Zero-Knowledge security model.

* **E2E Decrypted Export**: When clicking **Export JSON**, the client-side app decrypts each stored item in the active workspace using your in-memory stretched PBKDF2 key, compiles them into a plain text JSON backup file, and triggers a browser download.
* **Local Encrypted Import**: When selecting a `.json` backup file via **Import JSON**, the client validates the file schema, encrypts each secret's field list using **AES-256-GCM** with a new, random 12-byte IV, and uploads them to the server.
* **Sample Template**: You can click **Download Template** in the workspace header to download a skeleton import file ([keyvault_import_template.json](file:///c:/_ashwin/Projects/key-vault/keyvault_import_template.json)) mapping structural values:
  ```json
  [
    {
      "name": "My Prod Server DB",
      "itemType": "connection",
      "fields": [
        { "name": "Connection URI", "value": "postgres://db_user:password@host:5432/db", "type": "secret" },
        { "name": "DB Host", "value": "host.domain", "type": "plaintext" }
      ]
    }
  ]
  ```

---

## 🛠 Tech Stack & Code Conventions

### Backend (Go)

- **REST API**: Built with standard library and `go-chi/v5` router.
- **SOLID Principles**: Adheres strictly to dependency inversion (repositories decoupled from controllers via interfaces) and single responsibility.
- **Migrations**: Automatic database table schema creations and administrator seeding on startup.
- **Security**: JWT cookie authorization with `HttpOnly` and `SameSite` flags.

### Frontend Web (React + TypeScript)

- **Routing**: Managed by `@tanstack/react-router` with reactive auth state guards checking contexts on the fly.
- **React Compiler Aligned**: Formatted for standard React 19 compiler workflows, strictly omitting manual memoization.
- **State & Fetching**: Axios clients with custom interceptors and TanStack Query (`@tanstack/react-query`) for unified cache states.

### Android Standalone Mobile Application (`android/`)

- **Framework**: Built with **TypeScript**, **React Native**, and **Expo SDK 52**.
- **Why `localRepos` exist**:
  1. **100% Offline Standalone Application**: Like the Desktop Electron sidecar app, the Android APK embeds native C SQLite (`expo-sqlite`) directly inside the application bundle. Mobile users can manage, encrypt, and store credentials completely offline without any external Go backend server or network connectivity.
  2. **SOLID Repository Pattern**: Local repositories (`localAuthRepo`, `localWorkspaceRepo`, `localSecretRepo`, `localUserRepo`, `localAdminRepo`) decouple UI screens and custom hooks (`useVault`, `useAdmin`, `useAuth`) from storage mechanisms. Toggling `EXPO_PUBLIC_USE_EMBEDDED_DATABASE` in `.env` seamlessly switches between embedded local SQLite and remote REST servers without modifying UI components.
  3. **Preserved Zero-Knowledge Guarantees**: Client-side PBKDF2 key stretching and AES-256-GCM encryption occur entirely in React memory before calling `localSecretRepo`.

---

## 📂 Directory Layout

```
├── backend/                  # Go REST API Server
│   ├── cmd/api/              # Entry main.go bootstrapper
│   ├── internal/
│   │   ├── auth/             # JWT and RBAC middleware
│   │   ├── config/           # Environment configuration & CORS
│   │   ├── db/               # DB pool & migrations setup
│   │   ├── handlers/         # Controllers / Handlers
│   │   ├── models/           # Strongly typed database models
│   │   └── repository/       # Interface-segregated DB operations
│   └── Dockerfile            # Container compilation setup
│
├── frontend/                 # React + Vite + TS Client
│   ├── src/
│   │   ├── components/       # Reusable layout UI components (Modal, Table, etc.)
│   │   ├── pages/            # Routed endpoint views (LoginPage, AdminPage, etc.)
│   │   ├── context/          # Auth state & inactivity managers
│   │   ├── hooks/            # TanStack Query custom hook APIs
│   │   ├── utils/            # Client cryptography and Axios clients
│   │   ├── App.tsx           # Router configs & Query client providers
│   │   └── main.tsx
│
├── android/                  # Android Mobile Client Application Suite
│   ├── src/
│   │   ├── config/           # Strongly typed environment configuration (ENV)
│   │   ├── domain/           # Cryptography engine & domain types
│   │   ├── data/
│   │   │   ├── api/          # Modular API services & route constants
│   │   │   └── db/           # Embedded SQLite database & local repositories (localRepos)
│   │   └── presentation/     # Theme, custom hooks, screens, and components
│   ├── App.tsx               # Root Navigation & SQLite initialization
│   ├── index.ts              # Root TypeScript entry point
│   ├── .env                  # Environment variables
│   ├── tsconfig.json         # Path alias definitions (@/*)
│   └── package.json          # Dependencies & build scripts
```

---

## 🚀 Local Run & Debug Guide

### 1. Boot up the database in Docker

Start the PostgreSQL container:

```bash
docker-compose up -d db
```

### 2. Configure Local Settings

Ensure you have `.env` files in both directories:

- **`backend/.env`**:
  ```env
  PORT=8080
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=postgres
  DB_PASSWORD=localpassword123
  DB_NAME=keyvault
  DB_SSLMODE=disable
  JWT_SECRET=key-vault-super-secure-dev-jwt-secret-key-123456
  CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,app://,app://index.html
  DEFAULT_ADMIN_EMAIL=admin@keyvault.local
  DEFAULT_ADMIN_PASSWORD=adminpassword123
  ```
- **`frontend/.env`**:
  ```env
  VITE_API_BASE_URL=http://localhost:8080/api
  VITE_DEFAULT_ADMIN_EMAIL=admin@keyvault.local
  VITE_DEFAULT_ADMIN_PASSWORD=adminpassword123
  ```

### 3. Running & Building the Android Application Suite (`android/`)

From the `android/` directory:

```bash
cd android
pnpm install
```

#### Option A: Browser Mobile Emulator View (Instant — No Setup Required)
```bash
pnpm web
```
Open `http://localhost:8081` in Chrome/Edge, press `F12` and `Ctrl+Shift+M` to test the mobile app directly on your monitor!

#### Option B: Build Standalone APK Locally on Your PC (No Expo Account Required)
To compile a native `.apk` installer file directly on your local machine using Gradle:
```bash
pnpm build:apk
```

#### Option C: Build Standalone APK via EAS Cloud
If you have an Expo/EAS account configured:
```bash
pnpm build:apk:eas
```

### 4. Debug via VS Code (Antigravity IDE)

1. Install **Delve** debugger locally:
   ```bash
   go install github.com/go-delve/delve/cmd/dlv@latest
   ```
2. Open VS Code Debugger panel (`Ctrl+Shift+D`).
3. Select **Full Stack (Backend + Frontend)**.
4. Press **F5**. This will build the Go API locally, load `backend/.env` parameters, launch the debugger, and spawn a Chrome session for the frontend.

---

## ⚙️ Environment Configuration (`android/.env`)

Configure variables inside `android/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api
EXPO_PUBLIC_API_BASE_URL_EMULATOR=http://10.0.2.2:8080/api
EXPO_PUBLIC_DEFAULT_ADMIN_EMAIL=admin@keyvault.local
EXPO_PUBLIC_DEFAULT_ADMIN_PASSWORD=adminpassword123
EXPO_PUBLIC_DEFAULT_ADMIN_AUTH_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
EXPO_PUBLIC_USE_EMBEDDED_DATABASE=true
```

- Set `EXPO_PUBLIC_USE_EMBEDDED_DATABASE=true` for 100% standalone offline APK operation with embedded SQLite (`expo-sqlite`).
- Set `EXPO_PUBLIC_USE_EMBEDDED_DATABASE=false` to connect to a remote Go REST API backend.

---

## 👥 Default Accounts

- **Admin account**: `admin@keyvault.local` / `adminpassword123`

---

## 🧪 Backend BDD (Godog) Tests

Backend integration tests are implemented as **BDD Gherkin features** and executed with **godog**.

- Tests live in: `backend/tests/`
- Features: `backend/tests/features/*`
- Step definitions: `backend/tests/steps/*`
- Docker-based runner (Postgres + go test): `backend/tests/docker-compose.yml`

### Run the backend BDD suite

From the repo root:

```bash
docker-compose -f backend/tests/docker-compose.yml up --build
```

Full test documentation (setup, local run, docker commands) is in:
`backend/tests/README.md`.

---

## 🧪 Frontend & E2E Browser BDD Tests

The E2E test suite uses **Playwright** and **Cucumber (Gherkin)** to test the full E2E user flow inside a headless Chromium browser.

### Option 1: Run E2E Tests Locally on Your PC (Standard/Debug Mode)

If you are running the frontend and backend servers locally on your host machine (e.g., via the VS Code debugger or `go run` / `pnpm dev`):

1. **Navigate to the test suite directory**:
   ```bash
   cd e2e-tests
   ```
2. **Install testing dependencies**:
   ```bash
   pnpm install
   ```
3. **Install the Playwright browser binaries (one-time setup)**:
   ```bash
   pnpm exec playwright install chromium
   ```
4. **Execute the tests**:
   * **Windows PowerShell**:
     ```powershell
     $env:BASE_URL="http://localhost:5173"; pnpm test
     ```
   * **Linux / macOS / Git Bash**:
     ```bash
     BASE_URL=http://localhost:5173 pnpm test
     ```
   *(Note: If `BASE_URL` is omitted, it defaults automatically to `http://localhost:5173`.)*

---

### Option 2: Run E2E Tests in Docker (Automated Lifecycle Orchestration)

To run the entire E2E test stack (database, backend, frontend, and browser runners) inside isolated containers with automatic teardown and volume cleanup:

1. **Navigate to the test suite directory**:
   ```bash
   cd e2e-tests
   ```
2. **Run the automated E2E Docker script**:
   ```bash
   pnpm test:docker
   ```
   *This command automatically spins up the Docker Compose stack, executes all playbooks sequentially with custom persistent profiles (eliminating cookie leaks), sanitizes Cucumber report payloads, compiles the final HTML report, and tears down the containers/volumes to ensure clean state migrations.*

3. **Check the Output Reports & Media Assets**:
   * **Latest HTML Summary**: Open `e2e-tests/reports/html/index.html` directly in your web browser to see the full Gherkin execution dashboard.
   * **Timestamped Media Runs**: Each run outputs its media assets to a dedicated, timestamped folder to prevent files from getting mixed. Look inside:
     * **Videos**: [e2e-tests/reports/runs/<timestamp>/videos/](file:///c:/_ashwin/Projects/key-vault/e2e-tests/reports/runs) (slowed down to normal human speed with mouse cursors recorded).
     * **Screenshots**: [e2e-tests/reports/runs/<timestamp>/screenshots/](file:///c:/_ashwin/Projects/key-vault/e2e-tests/reports/runs) (showing exact viewports at step failures).
