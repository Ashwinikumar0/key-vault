package router

import (
	"net/http"

	"key-vault/backend/internal/config"
	"key-vault/backend/internal/handlers"
	"key-vault/backend/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

type RouterOptions struct {
	Config           *config.Config
	UserRepo         repository.UserRepository
	WorkspaceRepo    repository.WorkspaceRepository
	SecretRepo       repository.SecretRepository
	AuthHandler      *handlers.AuthHandler
	AdminHandler     *handlers.AdminHandler
	WorkspaceHandler *handlers.WorkspaceHandler
	SecretHandler    *handlers.SecretHandler
	UserHandler      *handlers.UserHandler
}

func Setup(opts RouterOptions) *chi.Mux {
	r := chi.NewRouter()

	// Core middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS Setup
	c := cors.New(cors.Options{
		AllowedOrigins:   opts.Config.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(c.Handler)

	// Health Check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// Base API Route Group
	r.Route("/api", func(apiRouter chi.Router) {
		RegisterAuthRoutes(apiRouter, opts)
		RegisterWorkspaceRoutes(apiRouter, opts)
		RegisterSecretRoutes(apiRouter, opts)
		RegisterUserRoutes(apiRouter, opts)
		RegisterAdminRoutes(apiRouter, opts)
	})

	return r
}
