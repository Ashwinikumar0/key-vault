package router

import (
	"key-vault/backend/internal/auth"

	"github.com/go-chi/chi/v5"
)

func RegisterSecretRoutes(r chi.Router, opts RouterOptions) {
	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware(opts.Config.JWTSecret))

		r.Post("/secrets", opts.SecretHandler.CreateSecret)
		r.Get("/secrets/{workspaceID}", opts.SecretHandler.ListSecrets)
		r.Put("/secrets/{secretID}", opts.SecretHandler.UpdateSecret)
		r.Delete("/secrets/{secretID}", opts.SecretHandler.DeleteSecret)
	})
}
