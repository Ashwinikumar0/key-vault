package router

import (
	"key-vault/backend/internal/auth"

	"github.com/go-chi/chi/v5"
)

func RegisterAuthRoutes(r chi.Router, opts RouterOptions) {
	r.Post("/auth/login", opts.AuthHandler.Login)
	r.Post("/auth/logout", opts.AuthHandler.Logout)

	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware(opts.Config.JWTSecret))
		r.Get("/auth/me", opts.AuthHandler.Me)
	})
}
