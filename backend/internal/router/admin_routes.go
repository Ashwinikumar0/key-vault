package router

import (
	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

func RegisterAdminRoutes(r chi.Router, opts RouterOptions) {
	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware(opts.Config.JWTSecret))
		r.Use(auth.RequireRole(models.RoleAdmin))

		r.Post("/admin/users", opts.AdminHandler.CreateUser)
		r.Get("/admin/stats", opts.AdminHandler.GetStats)
		r.Get("/admin/users", opts.AdminHandler.ListUsers)
	})
}
