# Backend BDD / Godog Test Suite

This folder contains the backend integration tests written as **BDD Gherkin features** and executed with **[godog](https://github.com/cucumber/godog)**.

## What gets tested

The suite spins up an in-memory HTTP router (the real Go handlers wired to Postgres repositories) and validates end-to-end behavior through feature scenarios:

- Authentication & session management (`/api/auth/*`)
- Workspace creation (`/api/workspaces`)
- Secret creation and listing (`/api/secrets`)
- Admin-only operations (`/api/admin/*`)

## Directory structure

- `features/` - Gherkin `.feature` files
- `steps/` - step definition implementations (Go)
- `main_test.go` / `setup_test.go` / `helpers_test.go` - godog + test environment wiring
- `docker-compose.yml` - optional test database + runner orchestration

## Prerequisites

- Go installed
- Docker installed (only if you want to use the provided docker-compose setup)
- A working Postgres connection (if running locally without docker)

## Run tests (local Go, requires running Postgres)

By default, tests expect Postgres connection details from environment variables set in `setup_test.go`:

- `DB_HOST` (default: `localhost`)
- `DB_PORT` (default: `5433`)
- `DB_USER` (default: `postgres`)
- `DB_PASSWORD` (default: `localpassword123`)
- `DB_NAME` (default: `keyvault_test`)
- `DB_SSLMODE` (default: `disable`)
- `JWT_SECRET` (default: `test-secret-key-12345678901234567890`)

Run:

```bash
go test -v ./...
```

From this folder, you can run:

```bash
go test -v ./...
```

## Run tests using Docker Compose (recommended)

This runs:

1. `test-db` (Postgres)
2. `test-runner` (go test executing the godog suite)

From the repo root:

```bash
docker-compose -f backend/tests/docker-compose.yml up --build
```

Expected behavior:

- The runner waits until Postgres is healthy.
- Test DB is migrated + seeded (admin seeded).
- Each scenario purges tables before/after execution to isolate state.

## Common commands

### Run with the docker-compose runner but only build/recreate containers

```bash
docker-compose -f backend/tests/docker-compose.yml up -d --build
```

### View logs

```bash
docker-compose -f backend/tests/docker-compose.yml logs -f
```

## Notes

- The suite resets DB state between scenarios by dropping tables: `secrets, workspaces, users`.
- Cookie-based auth is exercised via the test router and godog steps.
- Failures usually include the captured response body (from step assertions).
