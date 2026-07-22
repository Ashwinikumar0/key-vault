package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func Connect(cfg Config) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Ping with retry since db container might need a second to initialize fully
	var pingErr error
	for i := 0; i < 10; i++ {
		pingErr = db.Ping()
		if pingErr == nil {
			break
		}
		log.Printf("Waiting for database connection... (%d/10)", i+1)
		time.Sleep(2 * time.Second)
	}

	if pingErr != nil {
		return nil, fmt.Errorf("could not connect to database after retries: %w", pingErr)
	}

	return db, nil
}

func ConnectSQLite(dbPath string) (*sql.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	// Enable WAL mode and foreign keys for SQLite (critical for speed and integrity)
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("failed to set WAL mode: %w", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys=ON;"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	return db, nil
}

func MigrateAndSeed(db *sql.DB, adminEmail, adminPassword string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 1. Create schema
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			email VARCHAR(255) UNIQUE NOT NULL,
			hashed_password VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL DEFAULT 'user',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS workspaces (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			workspace_name VARCHAR(255) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS secrets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
			secret_name VARCHAR(255) NOT NULL,
			encrypted_value TEXT NOT NULL,
			iv VARCHAR(255) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_secrets_workspace ON secrets(workspace_id)`,
	}

	for _, q := range queries {
		if _, err := db.ExecContext(ctx, q); err != nil {
			return fmt.Errorf("failed migration query: %w", err)
		}
	}

	// 2. Check if admin exists, if not seed default admin
	var count int
	err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed counting users: %w", err)
	}

	if count == 0 {
		log.Println("No users found in database. Seeding default admin...")

		// Calculate client-side auth_hash in Go for seeding
		authHash := DeriveAuthHash(adminPassword, adminEmail)

		// Bcrypt the authHash
		bcryptHash, err := bcrypt.GenerateFromPassword([]byte(authHash), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to bcrypt admin password: %w", err)
		}

		insertQuery := `INSERT INTO users (email, hashed_password, role) VALUES ($1, $2, 'admin')`
		_, err = db.ExecContext(ctx, insertQuery, adminEmail, string(bcryptHash))
		if err != nil {
			return fmt.Errorf("failed seeding admin user: %w", err)
		}
		log.Println("Default admin account seeded successfully:")
		log.Printf("Email: %s", adminEmail)
		log.Printf("Password: %s", adminPassword)
	}

	return nil
}

func MigrateAndSeedSQLite(db *sql.DB, adminEmail, adminPassword string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// SQLite schemas
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			hashed_password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS workspaces (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			workspace_name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS secrets (
			id TEXT PRIMARY KEY,
			workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
			secret_name TEXT NOT NULL,
			encrypted_value TEXT NOT NULL,
			iv TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_secrets_workspace ON secrets(workspace_id)`,
	}

	for _, q := range queries {
		if _, err := db.ExecContext(ctx, q); err != nil {
			return fmt.Errorf("failed SQLite migration query: %w", err)
		}
	}

	// Seed default admin if database is empty
	var count int
	err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed counting users: %w", err)
	}

	if count == 0 {
		log.Println("No users found in SQLite database. Seeding default admin...")
		authHash := DeriveAuthHash(adminPassword, adminEmail)
		bcryptHash, err := bcrypt.GenerateFromPassword([]byte(authHash), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to bcrypt admin password: %w", err)
		}

		adminID := "admin-user-id" // Set a static initial admin id for seeding
		insertQuery := `INSERT INTO users (id, email, hashed_password, role) VALUES (?, ?, ?, 'admin')`
		_, err = db.ExecContext(ctx, insertQuery, adminID, adminEmail, string(bcryptHash))
		if err != nil {
			return fmt.Errorf("failed seeding admin user in SQLite: %w", err)
		}
		log.Println("Default admin account seeded successfully in SQLite.")
	}

	return nil
}

// DeriveAuthHash simulates client-side PBKDF2 double derivation to produce auth_hash
func DeriveAuthHash(password, email string) string {
	// 1. Derive stretched master key (100,000 iterations, SHA256)
	masterKey := pbkdf2.Key([]byte(password), []byte(email), 100000, 32, sha256.New)
	// 2. Derive auth hash (1 iteration, SHA256)
	authHashBytes := pbkdf2.Key(masterKey, []byte("auth-key-salt"), 1, 32, sha256.New)
	return hex.EncodeToString(authHashBytes)
}
