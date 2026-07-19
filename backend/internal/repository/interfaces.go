package repository

import (
	"context"
	"key-vault/backend/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetAll(ctx context.Context) ([]*models.User, error)
	GetStats(ctx context.Context) ([]*models.UserStat, error)
}

type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *models.Workspace) error
	GetByID(ctx context.Context, id string) (*models.Workspace, error)
	GetByUserID(ctx context.Context, userID string) ([]*models.Workspace, error)
}

type SecretRepository interface {
	Create(ctx context.Context, secret *models.Secret) error
	GetByWorkspaceID(ctx context.Context, workspaceID string) ([]*models.Secret, error)
}
