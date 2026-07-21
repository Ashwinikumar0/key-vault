# KeyVault Backend - Go REST API

This directory contains the Go REST API server for KeyVault. It handles user authentication, workspaces metadata, and encrypted secret management.

---

## 🔒 Security Architecture (Server-Side)

Following a strict Zero-Knowledge model, the backend database:
- **Never receives or holds** your master password or unencrypted secrets.
- Performs secondary hashing (`bcrypt`) on incoming client-side auth hashes.
- Holds only the random IVs, workspace mappings, and ciphertext blocks of stored secrets.

---

## 🛠 Local Setup & Running

### 1. Configure Environment variables
Ensure you have a `.env` file in this directory:

```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=localpassword123
DB_NAME=keyvault
DB_SSLMODE=disable
JWT_SECRET=key-vault-super-secure-dev-jwt-secret-key-123456
CORS_ALLOWED_ORIGINS=http://localhost:5173
DEFAULT_ADMIN_EMAIL=admin@keyvault.local
DEFAULT_ADMIN_PASSWORD=adminpassword123
```

### 2. Launching the API
To build and start the Go server:

```bash
# Start PostgreSQL db service via compose
docker-compose up -d db

# Run the API server locally
go run cmd/api/main.go
```
The API server will listen on `http://localhost:8080`.

---

## 🧪 Backend Integration BDD (Godog) Tests
The backend integration tests use **Godog** to test Gherkin feature files:
- Features are located in `tests/features/`
- Step definitions are located in `tests/steps/`

To run the Godog suite:
```bash
docker-compose -f tests/docker-compose.yml up --build
```
For more information, see [tests/README.md](tests/README.md).
