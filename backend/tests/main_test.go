package tests

import (
	"context"
	"testing"

	"key-vault/backend/tests/steps"
	"github.com/cucumber/godog"
)

func TestFeatures(t *testing.T) {
	opts := godog.Options{
		Format:    "pretty", // Formats logs to stdout nicely with green checkmarks
		Paths:     []string{"features"},
		Randomize: 0,
	}

	status := godog.TestSuite{
		Name:                "KeyVault BDD Gherkin Suite",
		ScenarioInitializer: initializeScenario,
		Options:             &opts,
	}.Run()

	if status != 0 {
		t.Fatalf("Gherkin integration tests failed with status code %d", status)
	}
}

func initializeScenario(ctx *godog.ScenarioContext) {
	// Initialize context for each scenario run
	tc := &steps.TestContext{
		DB:        testDB,
		Router:    testRouter,
		JWTSecret: jwtSecretKey,
	}

	// Isolate database states: purge tables before and after each scenario runs
	// Signatures match Godog v0.15+ requirements:
	ctx.Before(func(ctx context.Context, sc *godog.Scenario) (context.Context, error) {
		tc.CleanDB()
		return ctx, nil
	})

	ctx.After(func(ctx context.Context, sc *godog.Scenario, err error) (context.Context, error) {
		tc.CleanDB()
		return ctx, nil
	})

	// Register step definition files
	steps.RegisterAuthSteps(ctx, tc)
	steps.RegisterWorkspaceSteps(ctx, tc)
	steps.RegisterSecretSteps(ctx, tc)
	steps.RegisterAdminSteps(ctx, tc)
	steps.RegisterUserSteps(ctx, tc)
}
