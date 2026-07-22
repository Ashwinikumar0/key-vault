package main

import (
	"bufio"
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/db"
	"key-vault/backend/internal/handlers"
	"key-vault/backend/internal/logger"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

func main() {
	// Initialize Daily Logger Output
	logWriter, err := logger.NewDailyLogWriter("Logs")
	if err != nil {
		log.Fatalf("Fatal error initializing daily log writer: %v", err)
	}
	log.SetOutput(logWriter)

	// Load local .env configuration if present
	loadEnv()

	log.Println("Starting Key Vault API Server...")

	// 1. Load Configurations from Env
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", "localpassword123")
	dbName := getEnv("DB_NAME", "keyvault")
	dbSSL := getEnv("DB_SSLMODE", "disable")

	jwtSecret := getEnv("JWT_SECRET", "key-vault-super-secure-dev-jwt-secret-key-123456")
	port := getEnv("PORT", "8080")
	allowedOriginsEnv := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	allowedOrigins := strings.Split(allowedOriginsEnv, ",")

	adminEmail := getEnv("DEFAULT_ADMIN_EMAIL", "admin@keyvault.local")
	adminPassword := getEnv("DEFAULT_ADMIN_PASSWORD", "adminpassword123")

	// 2. Connect to Database
	dbDriver := getEnv("DB_DRIVER", "postgres")
	var sqlDB *sql.DB
	var dbErr error

	if dbDriver == "sqlite" {
		sqlitePath := getEnv("SQLITE_DB_PATH", "")
		if sqlitePath == "" {
			userDir, err := os.UserConfigDir()
			if err != nil {
				log.Fatalf("Failed to resolve user config directory: %v", err)
			}
			sqlitePath = filepath.Join(userDir, "KeyVault", "keyvault.db")
		}
		log.Printf("Connecting to SQLite database at: %s...", sqlitePath)
		sqlDB, dbErr = db.ConnectSQLite(sqlitePath)
		if dbErr != nil {
			log.Fatalf("Fatal error connecting to SQLite: %v", dbErr)
		}
	} else {
		dbCfg := db.Config{
			Host:     dbHost,
			Port:     dbPort,
			User:     dbUser,
			Password: dbPass,
			DBName:   dbName,
			SSLMode:  dbSSL,
		}
		log.Printf("Connecting to PostgreSQL database at %s:%s...", dbHost, dbPort)
		sqlDB, dbErr = db.Connect(dbCfg)
		if dbErr != nil {
			log.Fatalf("Fatal error connecting to PostgreSQL: %v", dbErr)
		}
	}
	defer sqlDB.Close()

	// 3. Migrate and Seed
	log.Println("Running database migrations and seeds...")
	if dbDriver == "sqlite" {
		err = db.MigrateAndSeedSQLite(sqlDB, adminEmail, adminPassword)
	} else {
		err = db.MigrateAndSeed(sqlDB, adminEmail, adminPassword)
	}
	if err != nil {
		log.Fatalf("Fatal error running migrations: %v", err)
	}
	log.Println("Database setup complete.")

	// 4. Initialize Repositories (SOLID - Dependency Injection)
	userRepo := repository.NewPostgresUserRepository(sqlDB)
	workspaceRepo := repository.NewPostgresWorkspaceRepository(sqlDB)
	secretRepo := repository.NewPostgresSecretRepository(sqlDB)

	// 5. Initialize Handlers (SOLID - Dependency Injection)
	authHandler := handlers.NewAuthHandler(userRepo, jwtSecret)
	adminHandler := handlers.NewAdminHandler(userRepo)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceRepo)
	secretHandler := handlers.NewSecretHandler(secretRepo, workspaceRepo)

	// 6. Setup Router
	r := chi.NewRouter()

	// Core middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS Setup
	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(c.Handler)

	// API Routing Layout
	r.Route("/api", func(r chi.Router) {
		// Public routes
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/logout", authHandler.Logout)

		// Authenticated routes
		r.Group(func(r chi.Router) {
			r.Use(auth.AuthMiddleware(jwtSecret))

			r.Get("/auth/me", authHandler.Me)

			// Workspaces
			r.Post("/workspaces", workspaceHandler.CreateWorkspace)
			r.Get("/workspaces", workspaceHandler.ListWorkspaces)

			// Secrets
			r.Post("/secrets", secretHandler.CreateSecret)
			r.Get("/secrets/{workspaceID}", secretHandler.ListSecrets)

			// Admin-only routes
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireRole(models.RoleAdmin))

				r.Post("/admin/users", adminHandler.CreateUser)
				r.Get("/admin/stats", adminHandler.GetStats)
				r.Get("/admin/users", adminHandler.ListUsers)
			})
		})
	})

	// Health check route
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// 7. Start HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("API Server is running on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe failed: %v", err)
		}
	}()

	// Wait for termination signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down API server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("API Server stopped.")
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		return // Ignore if .env is missing (e.g. in docker prod)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			// Strip surrounding quotes if present
			if strings.HasPrefix(value, "\"") && strings.HasSuffix(value, "\"") {
				value = value[1 : len(value)-1]
			} else if strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'") {
				value = value[1 : len(value)-1]
			}
			os.Setenv(key, value)
		}
	}
}
