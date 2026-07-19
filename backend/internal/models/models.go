package models

import "time"

type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

type User struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	HashedPassword string    `json:"-"`
	Role           UserRole  `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}

type Workspace struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	WorkspaceName string    `json:"workspace_name"`
	CreatedAt     time.Time `json:"created_at"`
}

type Secret struct {
	ID             string    `json:"id"`
	WorkspaceID    string    `json:"workspace_id"`
	SecretName     string    `json:"secret_name"`
	EncryptedValue string    `json:"encrypted_value"`
	IV             string    `json:"iv"`
	CreatedAt      time.Time `json:"created_at"`
}

type UserStat struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	SecretCount int    `json:"secret_count"`
}
