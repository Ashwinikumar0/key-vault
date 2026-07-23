package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"key-vault/backend/internal/config"
	"key-vault/backend/internal/db"
	"key-vault/backend/internal/handlers"
	"key-vault/backend/internal/logger"
	"key-vault/backend/internal/repository"
	"key-vault/backend/internal/router"
)

func main() {
	// Initialize Daily Logger Output
	logWriter, err := logger.NewDailyLogWriter("Logs")
	if err != nil {
		log.Fatalf("Fatal error initializing daily log writer: %v", err)
	}
	log.SetOutput(logWriter)

	log.Println("Starting Key Vault API Server...")

	// 1. Load Configurations from Env & Config package
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Fatal error loading configuration: %v", err)
	}

	// 2. Connect to Database
	var sqlDB *sql.DB
	var dbErr error

	if cfg.DBDriver == "sqlite" {
		sqlitePath := cfg.SQLiteDBPath
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
			Host:     cfg.DBHost,
			Port:     fmt.Sprintf("%d", cfg.DBPort),
			User:     cfg.DBUser,
			Password: cfg.DBPassword,
			DBName:   cfg.DBName,
			SSLMode:  "disable",
		}
		log.Printf("Connecting to PostgreSQL database at %s:%d...", cfg.DBHost, cfg.DBPort)
		sqlDB, dbErr = db.Connect(dbCfg)
		if dbErr != nil {
			log.Fatalf("Fatal error connecting to PostgreSQL: %v", dbErr)
		}
	}
	defer sqlDB.Close()

	// 3. Migrate and Seed Database
	log.Println("Running database migrations and seeds...")
	if cfg.DBDriver == "sqlite" {
		err = db.MigrateAndSeedSQLite(sqlDB, cfg.DefaultAdminEmail, cfg.DefaultAdminPassword)
	} else {
		err = db.MigrateAndSeed(sqlDB, cfg.DefaultAdminEmail, cfg.DefaultAdminPassword)
	}
	if err != nil {
		log.Fatalf("Fatal error running migrations: %v", err)
	}
	log.Println("Database setup complete.")

	// 4. Initialize Repositories (Dependency Injection)
	userRepo := repository.NewPostgresUserRepository(sqlDB)
	workspaceRepo := repository.NewPostgresWorkspaceRepository(sqlDB)
	secretRepo := repository.NewPostgresSecretRepository(sqlDB)

	// 5. Initialize Handlers (Dependency Injection)
	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
	adminHandler := handlers.NewAdminHandler(userRepo)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceRepo, secretRepo)
	secretHandler := handlers.NewSecretHandler(secretRepo, workspaceRepo)
	userHandler := handlers.NewUserHandler(userRepo)

	// 6. Setup Modular Router
	r := router.Setup(router.RouterOptions{
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

	// 7. Start HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("API Server is running on port %d", cfg.Port)
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
