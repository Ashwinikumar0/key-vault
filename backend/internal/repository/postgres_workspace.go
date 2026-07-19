package repository

import (
	"context"
	"database/sql"
	"errors"
	"key-vault/backend/internal/models"
)

type PostgresWorkspaceRepository struct {
	db *sql.DB
}

func NewPostgresWorkspaceRepository(db *sql.DB) WorkspaceRepository {
	return &PostgresWorkspaceRepository{db: db}
}

func (r *PostgresWorkspaceRepository) Create(ctx context.Context, workspace *models.Workspace) error {
	query := `INSERT INTO workspaces (user_id, workspace_name) VALUES ($1, $2) RETURNING id, created_at`
	err := r.db.QueryRowContext(ctx, query, workspace.UserID, workspace.WorkspaceName).Scan(&workspace.ID, &workspace.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresWorkspaceRepository) GetByID(ctx context.Context, id string) (*models.Workspace, error) {
	query := `SELECT id, user_id, workspace_name, created_at FROM workspaces WHERE id = $1`
	var ws models.Workspace
	err := r.db.QueryRowContext(ctx, query, id).Scan(&ws.ID, &ws.UserID, &ws.WorkspaceName, &ws.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &ws, nil
}

func (r *PostgresWorkspaceRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Workspace, error) {
	query := `SELECT id, user_id, workspace_name, created_at FROM workspaces WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		var ws models.Workspace
		if err := rows.Scan(&ws.ID, &ws.UserID, &ws.WorkspaceName, &ws.CreatedAt); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, &ws)
	}
	return workspaces, nil
}
