package steps

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"key-vault/backend/internal/db"
)

// TestContext holds the shared Gherkin step variables for HTTP and database states.
type TestContext struct {
	DB                  *sql.DB
	Router              http.Handler
	JWTSecret           string
	Response            *httptest.ResponseRecorder
	ActiveCookie        *http.Cookie
	TempUserEmail       string
	TempUserPassword    string
	CreatedWorkspaceID  string
}

// PerformRequest builds and routes an HTTP request simulating client-server exchanges.
func (c *TestContext) PerformRequest(method, path string, body []byte) {
	req := httptest.NewRequest(method, path, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	if c.ActiveCookie != nil {
		req.AddCookie(c.ActiveCookie)
	}
	c.Response = httptest.NewRecorder()
	c.Router.ServeHTTP(c.Response, req)
}

// CleanDB cleans test databases between scenarios.
func (c *TestContext) CleanDB() {
	if c.DB == nil {
		return
	}
	_, _ = c.DB.Exec("DROP TABLE IF EXISTS secrets, workspaces, users CASCADE")
}

// -----------------------------------------------------------------------------
// REUSABLE API SERVICE METHODS (DRY/SOLID)
// -----------------------------------------------------------------------------

// Login performs admin or user authentication using derived PBKDF2 parameters
func (c *TestContext) Login(email, password string) {
	authHash := db.DeriveAuthHash(password, email)
	payload := map[string]string{
		"email":    email,
		"password": authHash,
	}
	body, _ := json.Marshal(payload)
	c.PerformRequest("POST", "/api/auth/login", body)
}

// CreateUser registers a new vault user account via admin route
func (c *TestContext) CreateUser(email, role string) {
	payload := map[string]string{
		"email": email,
		"role":  role,
	}
	body, _ := json.Marshal(payload)
	c.PerformRequest("POST", "/api/admin/users", body)
}

// GetDatabaseStats fetches the database usage statistics
func (c *TestContext) GetDatabaseStats() {
	c.PerformRequest("GET", "/api/admin/stats", nil)
}

// CreateWorkspace provisions a new folder directory
func (c *TestContext) CreateWorkspace(name string) {
	payload := map[string]string{
		"workspace_name": name,
	}
	body, _ := json.Marshal(payload)
	c.PerformRequest("POST", "/api/workspaces", body)
}

// StoreSecret stores a client-encrypted payload inside the target workspace
func (c *TestContext) StoreSecret(workspaceID, name, value, iv string) {
	payload := map[string]string{
		"workspace_id":    workspaceID,
		"secret_name":     name,
		"encrypted_value": value,
		"iv":              iv,
	}
	body, _ := json.Marshal(payload)
	c.PerformRequest("POST", "/api/secrets", body)
}
