package handlers

import (
	"net/http"
	"strings"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"
)

type WorkspaceHandler struct {
	workspaceRepo repository.WorkspaceRepository
}

func NewWorkspaceHandler(workspaceRepo repository.WorkspaceRepository) *WorkspaceHandler {
	return &WorkspaceHandler{
		workspaceRepo: workspaceRepo,
	}
}

type CreateWorkspaceRequest struct {
	WorkspaceName string `json:"workspace_name"`
}

func (h *WorkspaceHandler) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateWorkspaceRequest
	if err := parseJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.WorkspaceName) == "" {
		respondWithError(w, http.StatusBadRequest, "workspace name is required")
		return
	}

	workspace := &models.Workspace{
		UserID:        userID,
		WorkspaceName: req.WorkspaceName,
	}

	err = h.workspaceRepo.Create(r.Context(), workspace)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to create workspace")
		return
	}

	respondWithJSON(w, http.StatusCreated, workspace)
}

func (h *WorkspaceHandler) ListWorkspaces(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	workspaces, err := h.workspaceRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to list workspaces")
		return
	}

	respondWithJSON(w, http.StatusOK, workspaces)
}
