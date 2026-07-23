package steps

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/cucumber/godog"
)

func RegisterSecretSteps(ctx *godog.ScenarioContext, tc *TestContext) {
	ctx.Step(`^I store secret details:$`, func(table *godog.Table) error {
		name := table.Rows[1].Cells[0].Value
		value := table.Rows[1].Cells[1].Value
		iv := table.Rows[1].Cells[2].Value

		tc.StoreSecret(tc.CreatedWorkspaceID, name, value, iv)

		if tc.Response.Code == http.StatusCreated {
			var resp map[string]interface{}
			json.Unmarshal(tc.Response.Body.Bytes(), &resp)
			if id, ok := resp["id"].(string); ok {
				tc.CreatedSecretID = id
			}
		}
		return nil
	})

	ctx.Step(`^I should be able to list secrets and see "([^"]*)"$`, func(expectedName string) error {
		path := fmt.Sprintf("/api/secrets/%s", tc.CreatedWorkspaceID)
		tc.PerformRequest("GET", path, nil)

		if tc.Response.Code != http.StatusOK {
			return fmt.Errorf("list secrets failed: status %d", tc.Response.Code)
		}

		var resp []map[string]interface{}
		json.Unmarshal(tc.Response.Body.Bytes(), &resp)

		if len(resp) == 0 {
			return fmt.Errorf("expected secrets list to not be empty")
		}

		found := false
		for _, s := range resp {
			if s["secret_name"] == expectedName {
				found = true
				break
			}
		}

		if !found {
			return fmt.Errorf("expected secret %s to be listed", expectedName)
		}
		return nil
	})

	ctx.Step(`^I update the stored secret to:$`, func(table *godog.Table) error {
		name := table.Rows[1].Cells[0].Value
		value := table.Rows[1].Cells[1].Value
		iv := table.Rows[1].Cells[2].Value

		path := fmt.Sprintf("/api/secrets/%s", tc.CreatedSecretID)
		payload := map[string]string{
			"secret_name":     name,
			"encrypted_value": value,
			"iv":              iv,
		}
		body, _ := json.Marshal(payload)
		tc.PerformRequest("PUT", path, body)
		return nil
	})

	ctx.Step(`^I delete the stored secret$`, func() error {
		path := fmt.Sprintf("/api/secrets/%s", tc.CreatedSecretID)
		tc.PerformRequest("DELETE", path, nil)
		return nil
	})

	ctx.Step(`^I attempt to store a secret named "([^"]*)" in the user's workspace$`, func(name string) error {
		tc.StoreSecret(tc.CreatedWorkspaceID, name, "Base64PayloadBlob==", "Base64IV==")
		return nil
	})

	ctx.Step(`^I attempt to list secrets from the user's workspace$`, func() error {
		path := fmt.Sprintf("/api/secrets/%s", tc.CreatedWorkspaceID)
		tc.PerformRequest("GET", path, nil)
		return nil
	})
}
