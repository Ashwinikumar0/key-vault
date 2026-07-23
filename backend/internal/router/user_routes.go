package router

import (
	"key-vault/backend/internal/auth"

	"github.com/go-chi/chi/v5"
)

func RegisterUserRoutes(r chi.Router, opts RouterOptions) {
	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware(opts.Config.JWTSecret))

		r.Delete("/user/account", opts.UserHandler.DeleteAccount)
	})
}
