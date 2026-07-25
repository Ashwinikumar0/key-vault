package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Port                int
	DBDriver            string
	DBHost              string
	DBPort              int
	DBUser              string
	DBPassword          string
	DBName              string
	SQLiteDBPath        string
	JWTSecret           string
	CORSAllowedOrigins []string
	DefaultAdminEmail   string
	DefaultAdminPassword string
}

// LoadConfig loads environment variables from .env file (if present) and OS environment
func LoadConfig() (*Config, error) {
	// Attempt to load .env file from working directory or parent directories
	loadDotEnv()

	portStr := getEnv("PORT", "8080")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 8080
	}

	dbPortStr := getEnv("DB_PORT", "5432")
	dbPort, err := strconv.Atoi(dbPortStr)
	if err != nil {
		dbPort = 5432
	}

	allowedOriginsStr := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8081,app://index.html")
	var allowedOrigins []string
	for _, o := range strings.Split(allowedOriginsStr, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	cfg := &Config{
		Port:                 port,
		DBDriver:             getEnv("DB_DRIVER", "postgres"),
		DBHost:               getEnv("DB_HOST", "localhost"),
		DBPort:               dbPort,
		DBUser:               getEnv("DB_USER", "postgres"),
		DBPassword:           getEnv("DB_PASSWORD", "localpassword123"),
		DBName:               getEnv("DB_NAME", "keyvault"),
		SQLiteDBPath:         getEnv("SQLITE_DB_PATH", "./keyvault.db"),
		JWTSecret:            getEnv("JWT_SECRET", "super-secret-jwt-key-vault-development-token-change-in-production"),
		CORSAllowedOrigins:  allowedOrigins,
		DefaultAdminEmail:    getEnv("DEFAULT_ADMIN_EMAIL", "admin@keyvault.local"),
		DefaultAdminPassword: getEnv("DEFAULT_ADMIN_PASSWORD", "adminpassword123"),
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

func loadDotEnv() {
	dir, err := os.Getwd()
	if err != nil {
		return
	}

	for {
		envPath := filepath.Join(dir, ".env")
		if file, err := os.Open(envPath); err == nil {
			scanner := bufio.NewScanner(file)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					key := strings.TrimSpace(parts[0])
					val := strings.TrimSpace(parts[1])
					val = strings.Trim(val, `"'`)
					if _, exists := os.LookupEnv(key); !exists {
						os.Setenv(key, val)
					}
				}
			}
			file.Close()
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
}

func (c *Config) PostgresConnectionString() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName)
}
