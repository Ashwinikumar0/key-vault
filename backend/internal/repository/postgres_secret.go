package repository

import (
	"context"
	"database/sql"
	"key-vault/backend/internal/models"
)

type PostgresSecretRepository struct {
	db *sql.DB
}

func NewPostgresSecretRepository(db *sql.DB) SecretRepository {
	return &PostgresSecretRepository{db: db}
}

func (r *PostgresSecretRepository) Create(ctx context.Context, secret *models.Secret) error {
	query := `INSERT INTO secrets (workspace_id, secret_name, encrypted_value, iv) VALUES ($1, $2, $3, $4) RETURNING id, created_at`
	err := r.db.QueryRowContext(ctx, query, secret.WorkspaceID, secret.SecretName, secret.EncryptedValue, secret.IV).Scan(&secret.ID, &secret.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresSecretRepository) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]*models.Secret, error) {
	query := `SELECT id, workspace_id, secret_name, encrypted_value, iv, created_at FROM secrets WHERE workspace_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var secrets []*models.Secret
	for rows.Next() {
		var s models.Secret
		if err := rows.Scan(&s.ID, &s.WorkspaceID, &s.SecretName, &s.EncryptedValue, &s.IV, &s.CreatedAt); err != nil {
			return nil, err
		}
		secrets = append(secrets, &s)
	}
	return secrets, nil
}
