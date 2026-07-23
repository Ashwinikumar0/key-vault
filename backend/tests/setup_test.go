package tests

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"testing"

	"key-vault/backend/internal/config"
	"key-vault/backend/internal/db"
	"key-vault/backend/internal/handlers"
	"key-vault/backend/internal/repository"
	"key-vault/backend/internal/router"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
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
	driver := getEnv("DB_DRIVER", "sqlite")
	os.Setenv("DB_DRIVER", driver)
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5433")
	user := getEnv("DB_USER", "postgres")
	pass := getEnv("DB_PASSWORD", "localpassword123")
	dbname := getEnv("DB_NAME", "keyvault_test")
	ssl := getEnv("DB_SSLMODE", "disable")

	var err error
	if driver == "sqlite" {
		sqlitePath := getEnv("SQLITE_DB_PATH", "./keyvault_test.db")
		log.Printf("Connecting BDD tests to SQLite database at: %s...", sqlitePath)
		testDB, err = db.ConnectSQLite(sqlitePath)
		if err != nil {
			log.Fatalf("Fatal: Failed to connect to test SQLite database: %v", err)
		}
	} else {
		cfg := db.Config{
			Host:     host,
			Port:     port,
			User:     user,
			Password: pass,
			DBName:   dbname,
			SSLMode:  ssl,
		}
		log.Printf("Connecting BDD tests to PostgreSQL database at %s:%s...", host, port)
		testDB, err = db.Connect(cfg)
		if err != nil {
			// Fallback to SQLite if PostgreSQL test container is unavailable
			sqlitePath := "./keyvault_test.db"
			log.Printf("PostgreSQL container unavailable (%v). Falling back to SQLite at: %s...", err, sqlitePath)
			os.Setenv("DB_DRIVER", "sqlite")
			driver = "sqlite"
			testDB, err = db.ConnectSQLite(sqlitePath)
			if err != nil {
				log.Fatalf("Fatal: Failed to connect to fallback SQLite database: %v", err)
			}
		}
	}

	// 2. Clean environment
	cleanDB()

	// 3. Run Migrations & Seed Admin
	adminEmail := getEnv("DEFAULT_ADMIN_EMAIL", "admin@test.local")
	adminPassword := getEnv("DEFAULT_ADMIN_PASSWORD", "adminpassword123")

	if driver == "sqlite" || os.Getenv("DB_DRIVER") == "sqlite" {
		err = db.MigrateAndSeedSQLite(testDB, adminEmail, adminPassword)
	} else {
		err = db.MigrateAndSeed(testDB, adminEmail, adminPassword)
	}
	if err != nil {
		log.Fatalf("Fatal: Failed to execute test migrations: %v", err)
	}

	jwtSecretKey = getEnv("JWT_SECRET", "test-secret-key-12345678901234567890")

	// 4. Initialize Repositories (Dependency Injection)
	userRepo := repository.NewPostgresUserRepository(testDB)
	workspaceRepo := repository.NewPostgresWorkspaceRepository(testDB)
	secretRepo := repository.NewPostgresSecretRepository(testDB)

	authHandler := handlers.NewAuthHandler(userRepo, jwtSecretKey)
	adminHandler := handlers.NewAdminHandler(userRepo)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceRepo, secretRepo)
	secretHandler := handlers.NewSecretHandler(secretRepo, workspaceRepo)
	userHandler := handlers.NewUserHandler(userRepo)

	// 5. Setup Router
	cfg := &config.Config{
		JWTSecret:          jwtSecretKey,
		CORSAllowedOrigins: []string{"*"},
	}

	testRouter = router.Setup(router.RouterOptions{
		Config:           cfg,
		UserRepo:         userRepo,
		WorkspaceRepo:    workspaceRepo,
		SecretRepo:       secretRepo,
		AuthHandler:      authHandler,
		AdminHandler:     adminHandler,
		WorkspaceHandler: workspaceHandler,
		SecretHandler:    secretHandler,
		UserHandler:      userHandler,
	})

	// 6. Execute Tests
	code := m.Run()

	// 7. Teardown & Purge DB Data
	log.Println("Teardown BDD integration test database...")
	cleanDB()
	testDB.Close()
	if driver == "sqlite" || os.Getenv("DB_DRIVER") == "sqlite" {
		os.Remove("./keyvault_test.db")
	}

	os.Exit(code)
}

func cleanDB() {
	if testDB == nil {
		return
	}
	if os.Getenv("DB_DRIVER") == "sqlite" {
		_, _ = testDB.Exec("DELETE FROM secrets;")
		_, _ = testDB.Exec("DELETE FROM workspaces;")
		_, _ = testDB.Exec("DELETE FROM users;")
	} else {
		_, _ = testDB.Exec("DROP TABLE IF EXISTS secrets, workspaces, users CASCADE")
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
