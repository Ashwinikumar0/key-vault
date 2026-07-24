# KeyVault Windows Desktop App

A self-contained, offline-first Windows desktop client for KeyVault. It embeds the Go API backend as a background sidecar process and uses a local SQLite database for zero-overhead, completely local zero-knowledge credential management.

---

## Architecture & SOLID Design

The desktop wrapper is built using **Electron**, **TypeScript**, and **Go**, adhering strictly to standard SOLID OOP design patterns:

1. **`main.ts` (Orchestrator)**: Focuses exclusively on Electron application setup, browser viewport instantiation, and coordinating startup tasks.
2. **`backend-manager.ts` (Lifecycle Manager) [SRP]**: Coordinates compiling and spawning the background `key-vault-backend.exe` sidecar. Manages environment configurations and clean process termination on window close.
3. **`protocol-handler.ts` (Reverse Proxy) [SRP]**: Operates the custom `app://` scheme, routing file requests and proxying `/api` queries to `localhost:8080`.
4. **Transparent Session Virtualization**: Bypasses Chromium's custom protocol cookie restrictions by capturing the session JWT token from `Set-Cookie` on login and injecting it automatically as a Bearer and Cookie header on all subsequent requests.

---

## Prerequisites

Ensure you have the following installed on your machine:
*   **Go** (v1.20+ is recommended, standard Go compiler)
*   **Node.js** (v18+ is recommended)
*   **pnpm** (Package Manager)

---

## Local Development Setup

Follow these steps to run the application locally:

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Build the React frontend client**:
    Navigate to the root `/frontend` folder and build the React static pages:
    ```bash
    pnpm build
    ```
3.  **Start the desktop app**:
    Navigate to this `desktop/` folder and start the application:
    ```bash
    pnpm start
    ```
    *Note: `pnpm start` will automatically compile the Go backend to `bin/key-vault-backend.exe`, copy the React client static assets into `frontend-dist/`, compile Electron TypeScript files, and launch the application window.*

---

## Configuration (`.env`)

You can customize the desktop client's behavior by editing the local `.env` file. In production, placing a `.env` file next to the installed `.exe` will load configurations dynamically:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Local port the Go backend sidecar will listen on | `8080` |
| `DB_DRIVER` | Database engine driver (`sqlite` or `postgres`) | `sqlite` |
| `SQLITE_DB_PATH` | File path to store your SQLite database | `%APPDATA%/key-vault-desktop/Database/keyvault.db` |
| `JWT_SECRET` | Cryptographic signature secret for user sessions | *Secure default dev token* |
| `CORS_ALLOWED_ORIGINS` | CORS origin authorization headers | `app://index.html,http://localhost:5173` |
| `DEFAULT_ADMIN_EMAIL` | Default email for initial seed admin account | `admin@keyvault.local` |
| `DEFAULT_ADMIN_PASSWORD` | Default password for initial seed admin account | `adminpassword123` |

---

## Packaging Stand-alone Installer (.exe)

To generate a standalone setup package installer (`dist-packaged/KeyVault Setup 1.0.0.exe`):

1.  Rebuild the React frontend in the `/frontend` directory.
2.  Run the build command in the `desktop/` directory:
    ```bash
    pnpm build
    ```
    *This automatically compiles the backend sidecar, packages the static files, bundles the compiled executable as an `extraResource`, and builds the final installer.*
