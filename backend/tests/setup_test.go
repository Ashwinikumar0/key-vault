package tests

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"testing"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/db"
	"key-vault/backend/internal/handlers"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"

	"github.com/go-chi/chi/v5"
	_ "github.com/lib/pq"
)

var (
	testDB                  *sql.DB
	testRouter              http.Handler
	jwtSecretKey            string
	adminAuthHash           string
	adminCookie             *http.Cookie
	regularUserCookie       *http.Cookie
	regularUserEmail        = "developer@test.local"
	regularUserTempPassword string
	workspaceID             string
)

func TestMain(m *testing.M) {
	log.Println("Setting up BDD Godog Integration Test Environment...")

	// 1. Setup Test DB Configuration
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5433")
	user := getEnv("DB_USER", "postgres")
	pass := getEnv("DB_PASSWORD", "localpassword123")
	dbname := getEnv("DB_NAME", "keyvault_test")
	ssl := getEnv("DB_SSLMODE", "disable")

	cfg := db.Config{
		Host:     host,
		Port:     port,
		User:     user,
		Password: pass,
		DBName:   dbname,
		SSLMode:  ssl,
	}

	// 2. Connect
	var err error
	testDB, err = db.Connect(cfg)
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to test database container: %v", err)
	}

	// 3. Clean environment
	cleanDB()

	// 4. Run Migrations & Seed Admin
	err = db.MigrateAndSeed(testDB, "admin@test.local", "adminpassword123")
	if err != nil {
		log.Fatalf("Fatal: Failed to execute test migrations: %v", err)
	}

	jwtSecretKey = getEnv("JWT_SECRET", "test-secret-key-12345678901234567890")
	adminAuthHash = db.DeriveAuthHash("adminpassword123", "admin@test.local")

	// 5. Initialize repositories and router handlers
	userRepo := repository.NewPostgresUserRepository(testDB)
	workspaceRepo := repository.NewPostgresWorkspaceRepository(testDB)
	secretRepo := repository.NewPostgresSecretRepository(testDB)

	authHandler := handlers.NewAuthHandler(userRepo, jwtSecretKey)
	adminHandler := handlers.NewAdminHandler(userRepo)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceRepo)
	secretHandler := handlers.NewSecretHandler(secretRepo, workspaceRepo)

	r := chi.NewRouter()
	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/logout", authHandler.Logout)

		r.Group(func(r chi.Router) {
			r.Use(auth.AuthMiddleware(jwtSecretKey))
			r.Get("/auth/me", authHandler.Me)

			// Workspaces
			r.Post("/workspaces", workspaceHandler.CreateWorkspace)
			r.Get("/workspaces", workspaceHandler.ListWorkspaces)

			// Secrets
			r.Post("/secrets", secretHandler.CreateSecret)
			r.Get("/secrets/{workspaceID}", secretHandler.ListSecrets)

			// Admin Operations
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireRole(models.RoleAdmin))
				r.Post("/admin/users", adminHandler.CreateUser)
				r.Get("/admin/stats", adminHandler.GetStats)
				r.Get("/admin/users", adminHandler.ListUsers)
			})
		})
	})

	testRouter = r

	// 6. Execute Tests
	code := m.Run()

	// 7. Teardown & Purge DB Data
	log.Println("Teardown BDD integration test database...")
	cleanDB()
	testDB.Close()

	os.Exit(code)
}

func cleanDB() {
	if testDB == nil {
		return
	}
	_, _ = testDB.Exec("DROP TABLE IF EXISTS secrets, workspaces, users CASCADE")
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
