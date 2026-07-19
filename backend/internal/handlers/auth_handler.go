package handlers

import (
	"net/http"
	"time"

	"key-vault/backend/internal/auth"
	"key-vault/backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthHandler(userRepo repository.UserRepository, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"` // This is the auth_hash sent by client
}

type LoginResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := parseJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}

	if user == nil {
		respondWithError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(req.Password))
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// Set HTTP-Only Cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   false, // Note: In prod this should be true (HTTPS only)
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
	})

	respondWithJSON(w, http.StatusOK, LoginResponse{
		ID:    user.ID,
		Email: user.Email,
		Role:  string(user.Role),
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Clear the HTTP-Only cookie by setting an expired date
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
	})

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "logged out successfully"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
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

	respondWithJSON(w, http.StatusOK, LoginResponse{
		ID:    user.ID,
		Email: user.Email,
		Role:  string(user.Role),
	})
}
