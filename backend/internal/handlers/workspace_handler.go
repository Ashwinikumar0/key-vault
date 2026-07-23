package handlers

import (
	"net/http"
	"strings"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"

	"github.com/go-chi/chi/v5"
)

type WorkspaceHandler struct {
	workspaceRepo repository.WorkspaceRepository
	secretRepo    repository.SecretRepository
}

func NewWorkspaceHandler(workspaceRepo repository.WorkspaceRepository, secretRepo repository.SecretRepository) *WorkspaceHandler {
	return &WorkspaceHandler{
		workspaceRepo: workspaceRepo,
		secretRepo:    secretRepo,
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

type UpdateWorkspaceRequest struct {
	WorkspaceName string `json:"workspace_name"`
}

func (h *WorkspaceHandler) UpdateWorkspace(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	workspaceID := chi.URLParam(r, "workspaceID")
	if workspaceID == "" {
		respondWithError(w, http.StatusBadRequest, "workspaceID parameter is required")
		return
	}

	var req UpdateWorkspaceRequest
	if err := parseJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.WorkspaceName) == "" {
		respondWithError(w, http.StatusBadRequest, "workspace name is required")
		return
	}

	ws, err := h.workspaceRepo.GetByID(r.Context(), workspaceID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if ws == nil {
		respondWithError(w, http.StatusNotFound, "workspace not found")
		return
	}

	if ws.UserID != userID {
		respondWithError(w, http.StatusForbidden, "forbidden: you do not own this workspace")
		return
	}

	ws.WorkspaceName = req.WorkspaceName
	if err := h.workspaceRepo.Update(r.Context(), ws); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to update workspace")
		return
	}

	respondWithJSON(w, http.StatusOK, ws)
}

func (h *WorkspaceHandler) DeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	workspaceID := chi.URLParam(r, "workspaceID")
	if workspaceID == "" {
		respondWithError(w, http.StatusBadRequest, "workspaceID parameter is required")
		return
	}

	ws, err := h.workspaceRepo.GetByID(r.Context(), workspaceID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if ws == nil {
		respondWithError(w, http.StatusNotFound, "workspace not found")
		return
	}

	if ws.UserID != userID {
		respondWithError(w, http.StatusForbidden, "forbidden: you do not own this workspace")
		return
	}

	// Safety check: ensure 0 secrets exist in workspace before allowing deletion
	count, err := h.secretRepo.CountSecrets(r.Context(), workspaceID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to check workspace secret count")
		return
	}

	if count > 0 {
		respondWithError(w, http.StatusBadRequest, "cannot delete workspace: credentials exist in this workspace. Please delete all credentials first.")
		return
	}

	if err := h.workspaceRepo.Delete(r.Context(), workspaceID); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to delete workspace")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "workspace deleted successfully"})
}
