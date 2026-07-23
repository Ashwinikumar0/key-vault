package handlers

import (
	"net/http"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"
)

type UserHandler struct {
	userRepo repository.UserRepository
}

func NewUserHandler(userRepo repository.UserRepository) *UserHandler {
	return &UserHandler{
		userRepo: userRepo,
	}
}

func (h *UserHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r.Context())
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if user == nil {
		respondWithError(w, http.StatusNotFound, "user not found")
		return
	}

	// Protect Super Admin / Admin accounts from deletion
	if user.Role == models.RoleAdmin {
		respondWithError(w, http.StatusForbidden, "forbidden: admin accounts cannot be deleted")
		return
	}

	err = h.userRepo.DeleteUserCascade(r.Context(), userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to delete user account and data")
		return
	}

	// Clear HTTP-Only session cookie on account deletion
	http.SetCookie(w, &http.Cookie{
		Name:     "jwt",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "account and all associated data deleted successfully"})
}
