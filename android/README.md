# KeyVault Android Mobile Client Application Suite

A modern zero-knowledge security vault mobile client for Android devices, built with TypeScript, React Native, and Expo, enforcing strict SOLID architectural principles and clean industry code practices.

---

## 🏗️ Architecture & SOLID Design Principles

### 1. Single Responsibility Principle (SRP)
- **`src/domain/crypto.ts`**: Pure client-side zero-knowledge cryptography engine (AES-GCM 256-bit payload encryption/decryption, PBKDF2 SHA-256 key derivation).
- **`src/data/api.ts`**: REST API client interface handling network data transfer objects and backend interactions.
- **`src/presentation/context/AuthContext.tsx`**: State management for user authentication session and memory-cached CryptoKey.
- **`src/presentation/theme/index.ts`**: Mobile dark glassmorphism design tokens and styling rules.

### 2. Open/Closed Principle (OCP)
- Extensible item templates (`login`, `api`, `connection`, `certificate`, `note`) with dynamic custom field definitions (`CustomField`).

### 3. Dependency Inversion Principle (DIP)
- ViewModels and screens consume domain use cases and repository contracts, independent of UI implementation.

---

## 📁 Directory Structure

```
android/
├── src/
│   ├── domain/               # Business Entities & Cryptography Engine
│   │   ├── types.ts          # Domain Interfaces (User, Workspace, Secret, CustomField)
│   │   └── crypto.ts         # PBKDF2 SHA-256 & AES-GCM 256-Bit Cryptography
│   ├── data/                 # REST API Client & Interceptors
│   │   └── api.ts            # Auth, Workspace, Secret, User, and Admin Endpoints
│   └── presentation/         # Mobile Navigation, Screens & UI Components
│       ├── theme/            # Color Tokens, Spacing, and Glassmorphism Styles
│       ├── context/          # Auth & Key Provider (AuthContext)
│       ├── components/       # Header, WorkspaceSelector, SecretCard, Modals
│       └── screens/          # LoginScreen, DashboardScreen, AdminScreen
├── App.tsx                   # Main Navigation & SafeArea Provider
├── package.json              # Dependencies & Scripts
├── tsconfig.json             # TypeScript Configuration
└── README.md                 # Documentation
```

---

## 🔐 Zero-Knowledge Security Principles

1. **Master Password Isolation**: The master password is NEVER transmitted over the wire or stored in local disk persistence.
2. **Client Key Derivation**: PBKDF2-HMAC-SHA256 (100,000 iterations) derives the authentication hash and AES-GCM 256-bit encryption key on-device.
3. **HTTP-Only Session Cookies**: Session security managed via secure HTTP-Only cookies.

---

## 🚀 Building & Running

### Prerequisites
- Node.js (v18+)
- Android Studio / Android Emulator or Physical Device

### Execution
1. Install dependencies:
   ```bash
   cd android
   pnpm install
   ```
2. Start Expo dev server:
   ```bash
   pnpm start
   ```
3. Run on Android Emulator:
   ```bash
   pnpm android
   ```
