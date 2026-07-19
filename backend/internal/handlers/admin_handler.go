package handlers

import (
	"crypto/rand"
	"math/big"
	"net/http"

	"key-vault/backend/internal/db"
	"key-vault/backend/internal/models"
	"key-vault/backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type AdminHandler struct {
	userRepo repository.UserRepository
}

func NewAdminHandler(userRepo repository.UserRepository) *AdminHandler {
	return &AdminHandler{
		userRepo: userRepo,
	}
}

type CreateUserRequest struct {
	Email string          `json:"email"`
	Role  models.UserRole `json:"role"`
}

type CreateUserResponse struct {
	ID                string `json:"id"`
	Email             string `json:"email"`
	Role              string `json:"role"`
	TemporaryPassword string `json:"temporary_password"`
}

func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := parseJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" {
		respondWithError(w, http.StatusBadRequest, "email is required")
		return
	}

	if req.Role == "" {
		req.Role = models.RoleUser
	}

	// Check if user already exists
	existing, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "database error")
		return
	}
	if existing != nil {
		respondWithError(w, http.StatusConflict, "user with this email already exists")
		return
	}

	// Generate temporary password
	tempPassword, err := generateTempPassword(16)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to generate temporary password")
		return
	}

	// Derive the authentication hash client-side representation in backend for seeding
	authHash := db.DeriveAuthHash(tempPassword, req.Email)

	// Bcrypt the authHash
	bcryptHash, err := bcrypt.GenerateFromPassword([]byte(authHash), bcrypt.DefaultCost)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	newUser := &models.User{
		Email:          req.Email,
		HashedPassword: string(bcryptHash),
		Role:           req.Role,
	}

	err = h.userRepo.Create(r.Context(), newUser)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	respondWithJSON(w, http.StatusCreated, CreateUserResponse{
		ID:                newUser.ID,
		Email:             newUser.Email,
		Role:              string(newUser.Role),
		TemporaryPassword: tempPassword,
	})
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.userRepo.GetStats(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}
	respondWithJSON(w, http.StatusOK, stats)
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.GetAll(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	respondWithJSON(w, http.StatusOK, users)
}

func generateTempPassword(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%"
	result := make([]byte, length)
	for i := range result {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		result[i] = charset[num.Int64()]
	}
	return string(result), nil
}
