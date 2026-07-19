package auth

import (
	"context"
	"errors"
	"net/http"
	"time"

	"key-vault/backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	EmailKey  contextKey = "email"
	RoleKey   contextKey = "role"
)

type Claims struct {
	UserID string          `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID string, email string, role models.UserRole, jwtSecret string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Try reading cookie first
			cookie, err := r.Cookie("token")
			var tokenStr string
			if err == nil {
				tokenStr = cookie.Value
			} else {
				// Fallback to Authorization Header (Bearer token) for flexibility
				authHeader := r.Header.Get("Authorization")
				if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
					tokenStr = authHeader[7:]
				}
			}

			if tokenStr == "" {
				http.Error(w, `{"error":"unauthorized: missing token"}`, http.StatusUnauthorized)
				return
			}

			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected signing method")
				}
				return []byte(jwtSecret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"unauthorized: invalid token"}`, http.StatusUnauthorized)
				return
			}

			// Inject user into context
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, EmailKey, claims.Email)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(allowedRoles ...models.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			roleVal := ctx.Value(RoleKey)
			if roleVal == nil {
				http.Error(w, `{"error":"forbidden: role metadata missing"}`, http.StatusForbidden)
				return
			}

			role, ok := roleVal.(models.UserRole)
			if !ok {
				http.Error(w, `{"error":"forbidden: invalid role metadata"}`, http.StatusForbidden)
				return
			}

			isAllowed := false
			for _, allowed := range allowedRoles {
				if role == allowed {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserID(ctx context.Context) (string, error) {
	val := ctx.Value(UserIDKey)
	if val == nil {
		return "", errors.New("user ID not found in context")
	}
	id, ok := val.(string)
	if !ok {
		return "", errors.New("invalid user ID type in context")
	}
	return id, nil
}

func GetEmail(ctx context.Context) (string, error) {
	val := ctx.Value(EmailKey)
	if val == nil {
		return "", errors.New("email not found in context")
	}
	email, ok := val.(string)
	if !ok {
		return "", errors.New("invalid email type in context")
	}
	return email, nil
}

func GetRole(ctx context.Context) (models.UserRole, error) {
	val := ctx.Value(RoleKey)
	if val == nil {
		return "", errors.New("role not found in context")
	}
	role, ok := val.(models.UserRole)
	if !ok {
		return "", errors.New("invalid role type in context")
	}
	return role, nil
}
