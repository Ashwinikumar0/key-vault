package repository

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"regexp"

	"key-vault/backend/internal/models"

	"github.com/google/uuid"
)

var pgWorkspacePlaceholderRegex = regexp.MustCompile(`\$\d+`)

func rebindWorkspace(query string) string {
	if os.Getenv("DB_DRIVER") == "sqlite" {
		return pgWorkspacePlaceholderRegex.ReplaceAllString(query, "?")
	}
	return query
}

type PostgresWorkspaceRepository struct {
	db *sql.DB
}

func NewPostgresWorkspaceRepository(db *sql.DB) WorkspaceRepository {
	return &PostgresWorkspaceRepository{db: db}
}

func (r *PostgresWorkspaceRepository) Create(ctx context.Context, workspace *models.Workspace) error {
	if workspace.ID == "" {
		workspace.ID = uuid.New().String()
	}
	query := rebindWorkspace(`INSERT INTO workspaces (id, user_id, workspace_name) VALUES ($1, $2, $3) RETURNING id, created_at`)
	err := r.db.QueryRowContext(ctx, query, workspace.ID, workspace.UserID, workspace.WorkspaceName).Scan(&workspace.ID, &workspace.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresWorkspaceRepository) GetByID(ctx context.Context, id string) (*models.Workspace, error) {
	query := rebindWorkspace(`SELECT id, user_id, workspace_name, created_at FROM workspaces WHERE id = $1`)
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
	query := rebindWorkspace(`SELECT id, user_id, workspace_name, created_at FROM workspaces WHERE user_id = $1 ORDER BY created_at DESC`)
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
