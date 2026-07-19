package repository

import (
	"context"
	"database/sql"
	"errors"
	"key-vault/backend/internal/models"
)

type PostgresUserRepository struct {
	db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) UserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user *models.User) error {
	query := `INSERT INTO users (email, hashed_password, role) VALUES ($1, $2, $3) RETURNING id, created_at`
	err := r.db.QueryRowContext(ctx, query, user.Email, user.HashedPassword, user.Role).Scan(&user.ID, &user.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	query := `SELECT id, email, hashed_password, role, created_at FROM users WHERE id = $1`
	var user models.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(&user.ID, &user.Email, &user.HashedPassword, &user.Role, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, hashed_password, role, created_at FROM users WHERE email = $1`
	var user models.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(&user.ID, &user.Email, &user.HashedPassword, &user.Role, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *PostgresUserRepository) GetAll(ctx context.Context) ([]*models.User, error) {
	query := `SELECT id, email, role, created_at FROM users ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, &u)
	}
	return users, nil
}

func (r *PostgresUserRepository) GetStats(ctx context.Context) ([]*models.UserStat, error) {
	query := `
		SELECT u.id, u.email, COUNT(s.id) as secret_count
		FROM users u
		LEFT JOIN workspaces w ON u.id = w.user_id
		LEFT JOIN secrets s ON w.id = s.workspace_id
		GROUP BY u.id, u.email
		ORDER BY u.email ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []*models.UserStat
	for rows.Next() {
		var s models.UserStat
		if err := rows.Scan(&s.UserID, &s.Email, &s.SecretCount); err != nil {
			return nil, err
		}
		stats = append(stats, &s)
	}
	return stats, nil
}
