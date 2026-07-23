package steps

import (
	"fmt"
	"os"

	"key-vault/backend/internal/db"

	"github.com/cucumber/godog"
)

func RegisterAuthSteps(ctx *godog.ScenarioContext, tc *TestContext) {
	ctx.Step(`^a clean test database with seeded admin:$`, func(table *godog.Table) error {
		email := table.Rows[1].Cells[0].Value
		password := table.Rows[1].Cells[1].Value

		tc.CleanDB()
		var err error
		if os.Getenv("DB_DRIVER") == "sqlite" {
			err = db.MigrateAndSeedSQLite(tc.DB, email, password)
		} else {
			err = db.MigrateAndSeed(tc.DB, email, password)
		}
		if err != nil {
			return fmt.Errorf("failed to run migrations & seeds: %w", err)
		}
		tc.ActiveCookie = nil
		tc.Response = nil
		return nil
	})

	ctx.Step(`^I login with credentials:$`, func(table *godog.Table) error {
		email := table.Rows[1].Cells[0].Value
		password := table.Rows[1].Cells[1].Value

		// Reusable Context API Service
		tc.Login(email, password)

		// Extract JWT cookie if set (Let assertion steps verify it, do not fail scenario here)
		cookies := tc.Response.Result().Cookies()
		tc.ActiveCookie = nil
		for _, c := range cookies {
			if c.Name == "token" {
				tc.ActiveCookie = c
			}
		}
		return nil
	})

	ctx.Step(`^the response status code should be (\d+)$`, func(code int) error {
		if tc.Response == nil {
			return fmt.Errorf("no response captured")
		}
		if tc.Response.Code != code {
			return fmt.Errorf("expected response status %d, got %d. Body: %s", code, tc.Response.Code, tc.Response.Body.String())
		}
		return nil
	})

	ctx.Step(`^the session cookie "([^"]*)" should be set$`, func(name string) error {
		if tc.ActiveCookie == nil || tc.ActiveCookie.Name != name {
			// Print out captured cookies for debugging help
			cookies := tc.Response.Result().Cookies()
			var names []string
			for _, c := range cookies {
				names = append(names, c.Name)
			}
			return fmt.Errorf("expected cookie %s to be set. Captured cookies: %v", name, names)
		}
		return nil
	})

	ctx.Step(`^the session cookie "([^"]*)" should not be set$`, func(name string) error {
		cookies := tc.Response.Result().Cookies()
		for _, c := range cookies {
			if c.Name == name && c.Value != "" && c.MaxAge >= 0 {
				return fmt.Errorf("expected cookie %s to NOT be set, but it was found", name)
			}
		}
		return nil
	})

	ctx.Step(`^I request session profile without login$`, func() error {
		tc.ActiveCookie = nil
		tc.PerformRequest("GET", "/api/auth/me", nil)
		return nil
	})

	ctx.Step(`^I logout$`, func() error {
		tc.PerformRequest("POST", "/api/auth/logout", nil)
		tc.ActiveCookie = nil
		return nil
	})
}
