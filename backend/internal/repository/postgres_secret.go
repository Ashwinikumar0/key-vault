package repository

import (
	"context"
	"database/sql"
	"os"
	"regexp"

	"key-vault/backend/internal/models"

	"github.com/google/uuid"
)

var pgSecretPlaceholderRegex = regexp.MustCompile(`\$\d+`)

func rebindSecret(query string) string {
	if os.Getenv("DB_DRIVER") == "sqlite" {
		return pgSecretPlaceholderRegex.ReplaceAllString(query, "?")
	}
	return query
}

type PostgresSecretRepository struct {
	db *sql.DB
}

func NewPostgresSecretRepository(db *sql.DB) SecretRepository {
	return &PostgresSecretRepository{db: db}
}

func (r *PostgresSecretRepository) Create(ctx context.Context, secret *models.Secret) error {
	if secret.ID == "" {
		secret.ID = uuid.New().String()
	}
	query := rebindSecret(`INSERT INTO secrets (id, workspace_id, secret_name, encrypted_value, iv) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`)
	err := r.db.QueryRowContext(ctx, query, secret.ID, secret.WorkspaceID, secret.SecretName, secret.EncryptedValue, secret.IV).Scan(&secret.ID, &secret.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresSecretRepository) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]*models.Secret, error) {
	query := rebindSecret(`SELECT id, workspace_id, secret_name, encrypted_value, iv, created_at FROM secrets WHERE workspace_id = $1 ORDER BY created_at DESC`)
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
