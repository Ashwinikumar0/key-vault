package steps

import (
	"github.com/cucumber/godog"
)

func RegisterUserSteps(ctx *godog.ScenarioContext, tc *TestContext) {
	ctx.Step(`^I request account deletion$`, func() error {
		tc.PerformRequest("DELETE", "/api/user/account", nil)
		return nil
	})
}
