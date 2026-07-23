package handlers

import (
	"net/http"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"

	"github.com/go-chi/chi/v5"
)

type SecretHandler struct {
	secretRepo    repository.SecretRepository
	workspaceRepo repository.WorkspaceRepository
}

func NewSecretHandler(secretRepo repository.SecretRepository, workspaceRepo repository.WorkspaceRepository) *SecretHandler {
	return &SecretHandler{
		secretRepo:    secretRepo,
		workspaceRepo: workspaceRepo,
	}
}

type CreateSecretRequest struct {
	WorkspaceID    string `json:"workspace_id"`
	SecretName     string `json:"secret_name"`
	EncryptedValue string `json:"encrypted_value"`
	IV             string `json:"iv"`
}

func (h *SecretHandler) CreateSecret(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateSecretRequest
	if err := parseJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.WorkspaceID == "" || req.SecretName == "" || req.EncryptedValue == "" || req.IV == "" {
		respondWithError(w, http.StatusBadRequest, "workspace_id, secret_name, encrypted_value, and iv are required")
		return
	}

	// Verify workspace ownership
	ws, err := h.workspaceRepo.GetByID(r.Context(), req.WorkspaceID)
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

	secret := &models.Secret{
		WorkspaceID:    req.WorkspaceID,
		SecretName:     req.SecretName,
		EncryptedValue: req.EncryptedValue,
		IV:             req.IV,
	}

	err = h.secretRepo.Create(r.Context(), secret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to store secret")
		return
	}

	respondWithJSON(w, http.StatusCreated, secret)
}

func (h *SecretHandler) ListSecrets(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	workspaceID := chi.URLParam(r, "workspaceID")
	if workspaceID == "" {
		respondWithError(w, http.StatusBadRequest, "workspace_id parameter is required")
		return
	}

	// Verify workspace ownership
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

	secrets, err := h.secretRepo.GetByWorkspaceID(r.Context(), workspaceID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to list secrets")
		return
	}

	respondWithJSON(w, http.StatusOK, secrets)
}

func (h *SecretHandler) DeleteSecret(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	secretID := chi.URLParam(r, "secretID")
	if secretID == "" {
		respondWithError(w, http.StatusBadRequest, "secretID parameter is required")
		return
	}

	secret, err := h.secretRepo.GetByID(r.Context(), secretID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if secret == nil {
		respondWithError(w, http.StatusNotFound, "secret not found")
		return
	}

	// Verify workspace ownership
	ws, err := h.workspaceRepo.GetByID(r.Context(), secret.WorkspaceID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if ws == nil || ws.UserID != userID {
		respondWithError(w, http.StatusForbidden, "forbidden: you do not own this workspace")
		return
	}

	if err := h.secretRepo.Delete(r.Context(), secretID); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to delete secret")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "secret deleted successfully"})
}

type UpdateSecretRequest struct {
	SecretName     string `json:"secret_name"`
	EncryptedValue string `json:"encrypted_value"`
	IV             string `json:"iv"`
}

func (h *SecretHandler) UpdateSecret(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	secretID := chi.URLParam(r, "secretID")
	if secretID == "" {
		respondWithError(w, http.StatusBadRequest, "secretID parameter is required")
		return
	}

	var req UpdateSecretRequest
	if err := parseJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.SecretName == "" || req.EncryptedValue == "" || req.IV == "" {
		respondWithError(w, http.StatusBadRequest, "secret_name, encrypted_value, and iv are required")
		return
	}

	secret, err := h.secretRepo.GetByID(r.Context(), secretID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if secret == nil {
		respondWithError(w, http.StatusNotFound, "secret not found")
		return
	}

	// Verify workspace ownership
	ws, err := h.workspaceRepo.GetByID(r.Context(), secret.WorkspaceID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if ws == nil || ws.UserID != userID {
		respondWithError(w, http.StatusForbidden, "forbidden: you do not own this workspace")
		return
	}

	secret.SecretName = req.SecretName
	secret.EncryptedValue = req.EncryptedValue
	secret.IV = req.IV

	if err := h.secretRepo.Update(r.Context(), secret); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to update secret")
		return
	}

	respondWithJSON(w, http.StatusOK, secret)
}
