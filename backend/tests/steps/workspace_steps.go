package steps

import (
	"encoding/json"
	"fmt"
	"net/http"

	"key-vault/backend/internal/db"
	"github.com/cucumber/godog"
)

func RegisterWorkspaceSteps(ctx *godog.ScenarioContext, tc *TestContext) {
	ctx.Step(`^an authenticated user "([^"]*)" is created by admin$`, func(email string) error {
		// Log in as admin
		adminAuth := db.DeriveAuthHash("adminpassword123", "admin@test.local")
		loginPayload := map[string]string{
			"email":    "admin@test.local",
			"password": adminAuth,
		}
		loginBody, _ := json.Marshal(loginPayload)
		tc.PerformRequest("POST", "/api/auth/login", loginBody)

		if tc.Response.Code != http.StatusOK {
			return fmt.Errorf("failed to authenticate admin to seed user: status %d, body: %s", tc.Response.Code, tc.Response.Body.String())
		}

		cookies := tc.Response.Result().Cookies()
		var adminCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == "token" {
				adminCookie = c
			}
		}

		if adminCookie == nil {
			return fmt.Errorf("failed to authenticate admin to seed user")
		}

		// Register the new standard user account
		createUserPayload := map[string]string{
			"email": email,
			"role":  "user",
		}
		createBody, _ := json.Marshal(createUserPayload)
		tc.ActiveCookie = adminCookie
		tc.PerformRequest("POST", "/api/admin/users", createBody)

		if tc.Response.Code != http.StatusCreated {
			return fmt.Errorf("admin user creation failed: status %d", tc.Response.Code)
		}

		var resp map[string]interface{}
		json.Unmarshal(tc.Response.Body.Bytes(), &resp)
		tempPwd, ok := resp["temporary_password"].(string)
		if !ok || tempPwd == "" {
			return fmt.Errorf("no temporary password returned in response")
		}

		tc.TempUserEmail = email
		tc.TempUserPassword = tempPwd
		tc.ActiveCookie = nil // Clear session
		return nil
	})

	ctx.Step(`^I login as "([^"]*)"$`, func(email string) error {
		if email != tc.TempUserEmail {
			return fmt.Errorf("requested login as %s, but expected %s", email, tc.TempUserEmail)
		}
		userAuth := db.DeriveAuthHash(tc.TempUserPassword, tc.TempUserEmail)
		loginPayload := map[string]string{
			"email":    tc.TempUserEmail,
			"password": userAuth,
		}
		body, _ := json.Marshal(loginPayload)
		tc.PerformRequest("POST", "/api/auth/login", body)

		if tc.Response.Code != http.StatusOK {
			return fmt.Errorf("login failed: status %d", tc.Response.Code)
		}

		cookies := tc.Response.Result().Cookies()
		for _, c := range cookies {
			if c.Name == "token" {
				tc.ActiveCookie = c
			}
		}
		return nil
	})

	ctx.Step(`^I create a workspace named "([^"]*)"$`, func(name string) error {
		workspacePayload := map[string]string{
			"workspace_name": name,
		}
		body, _ := json.Marshal(workspacePayload)
		tc.PerformRequest("POST", "/api/workspaces", body)

		if tc.Response.Code != http.StatusCreated {
			return fmt.Errorf("failed to create workspace: status %d", tc.Response.Code)
		}

		var resp map[string]interface{}
		json.Unmarshal(tc.Response.Body.Bytes(), &resp)
		id, ok := resp["id"].(string)
		if !ok || id == "" {
			return fmt.Errorf("no id returned in workspace response")
		}
		tc.CreatedWorkspaceID = id
		return nil
	})

	ctx.Step(`^I request workspace creation with name "([^"]*)"$`, func(name string) error {
		workspacePayload := map[string]string{
			"workspace_name": name,
		}
		body, _ := json.Marshal(workspacePayload)
		tc.PerformRequest("POST", "/api/workspaces", body)
		return nil
	})

	ctx.Step(`^I request workspace creation with name "([^"]*)" without login$`, func(name string) error {
		tc.ActiveCookie = nil
		workspacePayload := map[string]string{
			"workspace_name": name,
		}
		body, _ := json.Marshal(workspacePayload)
		tc.PerformRequest("POST", "/api/workspaces", body)
		return nil
	})

	ctx.Step(`^the workspace name in response should be "([^"]*)"$`, func(expectedName string) error {
		var resp map[string]interface{}
		json.Unmarshal(tc.Response.Body.Bytes(), &resp)
		actualName, ok := resp["workspace_name"].(string)
		if !ok || actualName != expectedName {
			return fmt.Errorf("expected workspace name %s, got %v", expectedName, resp["workspace_name"])
		}
		return nil
	})
}
