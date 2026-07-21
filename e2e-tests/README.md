# KeyVault E2E BDD Test Suite

This directory contains the End-to-End (E2E) testing framework for KeyVault. It uses **Playwright** and **Cucumber (Gherkin)** to verify frontend and backend interactions inside a secure Chromium browser context.

---

## 📂 Project Directory Structure

```
├── features/                 # Cucumber Gherkin feature files
│   ├── admin.feature         # Admin user creation scenarios
│   ├── auth.feature          # Login, logout, and validation scenarios
│   ├── secret.feature        # Cryptographic key storage scenarios
│   └── workspace.feature     # Workspace directory folder management
│
├── steps/                    # TypeScript BDD step definitions
│   ├── world.ts              # Playwright browser lifecycle & context configs
│   ├── auth_steps.ts         # User auth step assertions
│   ├── secret_steps.ts       # Encryption/decryption/import/export step actions
│   └── workspace_steps.ts    # Folder creation and navigation step actions
│
├── helpers/                  # Page Object Model (POM) and web helpers
│   └── page_helpers.ts       # Base page automation & stabilization drivers
│
├── reports/                  # Generated test run reports
│   ├── html/index.html       # The compiled HTML cucumber report dashboard
│   ├── json/                 # Raw Cucumber JSON logs
│   └── runs/                 # Timestamped run assets (videos & screenshots)
```

---

## 🛠 Prerequisites & Installation

### Option A: Local Run (Debug Mode)
If you want to run tests directly on your host machine against local dev servers:

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Install Playwright Browser Binary**:
   ```bash
   pnpm exec playwright install chromium
   ```

### Option B: Docker Containerized Run (Isolated Stack)
No dependencies are required on your host machine except for **Docker** and **Docker Compose**.

---

## 🚀 Running E2E Tests

### 1. Locally on your Host Machine (Host Network)
Ensure the backend (`http://localhost:8080`) and frontend (`http://localhost:5173`) servers are currently running on your PC.

* **Run all scenarios**:
  ```bash
  pnpm test
  ```
* **Run with a custom URL**:
  ```bash
  BASE_URL="http://localhost:3000" pnpm test
  ```

### 2. Isolated Network in Docker (Automated Lifecycle)
To boot up isolated databases, backends, frontends, and browser runner nodes, run:

```bash
pnpm test:docker
```
*This command executes [run_docker_tests.js](file:///c:/_ashwin/Projects/key-vault/e2e-tests/run_docker_tests.js) to automate booting up containers, routing same-site proxies, running scenarios, sanitizing log payloads, and tearing down container stacks/volumes cleanly.*

---

## 📊 Viewing HTML Reports & Media Assets

Upon test completion, the suite automatically builds a rich execution report:

1. **Open the HTML Dashboard**:
   Open `e2e-tests/reports/html/index.html` directly in your web browser to inspect the full test execution dashboard, showing step pass/fail ratios, logs, and system details.

2. **Retrieve Failure Screenshots & Videos**:
   To prevent test runs from polluting each other, all media recordings are saved to unique timestamped folders under `reports/runs/`:
   - **Slowed-Down Playback Videos**: Located in `reports/runs/<timestamp>/videos/*.webm`. These run at normal human speeds and capture the **mouse pointer** (using a custom cursor overlay) so you can review exactly where clicks occurred.
   - **Failure Viewport Screenshots**: Located in `reports/runs/<timestamp>/screenshots/*.png`, capturing the exact screen state at the millisecond of any assertion failure.
