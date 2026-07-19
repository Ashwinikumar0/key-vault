package steps

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/cucumber/godog"
)

func RegisterAdminSteps(ctx *godog.ScenarioContext, tc *TestContext) {
	ctx.Step(`^I create user account:$`, func(table *godog.Table) error {
		email := table.Rows[1].Cells[0].Value
		role := table.Rows[1].Cells[1].Value

		// Reusable Admin User Creator Service
		tc.CreateUser(email, role)
		return nil
	})

	ctx.Step(`^the user temporary password should be returned$`, func() error {
		var resp map[string]interface{}
		json.Unmarshal(tc.Response.Body.Bytes(), &resp)
		tempPwd, ok := resp["temporary_password"].(string)
		if !ok || tempPwd == "" {
			return fmt.Errorf("no temporary password returned in response body")
		}
		return nil
	})

	ctx.Step(`^I request database statistics$`, func() error {
		// Reusable Admin Stats Retrieval Service
		tc.GetDatabaseStats()
		return nil
	})

	ctx.Step(`^the statistics metrics should contain:$`, func(table *godog.Table) error {
		email := table.Rows[1].Cells[0].Value
		countStr := table.Rows[1].Cells[1].Value
		count, err := strconv.Atoi(countStr)
		if err != nil {
			return fmt.Errorf("invalid count integer parameter: %w", err)
		}

		if tc.Response.Code != http.StatusOK {
			return fmt.Errorf("expected status 200, got %d. Body: %s", tc.Response.Code, tc.Response.Body.String())
		}

		var resp []map[string]interface{}
		json.Unmarshal(tc.Response.Body.Bytes(), &resp)

		found := false
		for _, stat := range resp {
			if stat["email"] == email {
				found = true
				actualCount, ok := stat["secret_count"].(float64)
				if !ok || int(actualCount) != count {
					return fmt.Errorf("expected secret count %d for user %s, got %v", count, email, stat["secret_count"])
				}
			}
		}

		if !found {
			return fmt.Errorf("expected statistics to contain user %s, but they were missing", email)
		}
		return nil
	})
}
