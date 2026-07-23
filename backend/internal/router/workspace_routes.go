package router

import (
	"key-vault/backend/internal/auth"

	"github.com/go-chi/chi/v5"
)

func RegisterWorkspaceRoutes(r chi.Router, opts RouterOptions) {
	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware(opts.Config.JWTSecret))

		r.Post("/workspaces", opts.WorkspaceHandler.CreateWorkspace)
		r.Get("/workspaces", opts.WorkspaceHandler.ListWorkspaces)
		r.Put("/workspaces/{workspaceID}", opts.WorkspaceHandler.UpdateWorkspace)
		r.Delete("/workspaces/{workspaceID}", opts.WorkspaceHandler.DeleteWorkspace)
	})
}
