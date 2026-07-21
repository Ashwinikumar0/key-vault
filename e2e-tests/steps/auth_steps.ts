import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "./world";
import { AuthPageHelper, getUniqueEmail } from "../helpers/page_helpers";

Given("I navigate to the login page", async function (this: CustomWorld) {
  const auth = new AuthPageHelper(this.page);
  await auth.navigateTo(this.baseUrl);
});

When("I log in with credentials:", async function (this: CustomWorld, table) {
  const auth = new AuthPageHelper(this.page);
  const row = table.hashes()[0];
  const email = getUniqueEmail(row.email, this.runTimestamp);
  const password = row.password === "<tempPassword>" ? this.tempPassword : row.password;
  await auth.login(email, password);
});

Then("I should be redirected to the dashboard", async function (this: CustomWorld) {
  await Promise.race([
    this.page.waitForSelector("[data-testid='create-workspace-trigger-empty']", { state: "visible", timeout: 10000 }),
    this.page.waitForSelector("[data-testid='add-secret-trigger']", { state: "visible", timeout: 10000 }),
    this.page.waitForSelector("[data-testid='create-user-trigger']", { state: "visible", timeout: 10000 })
  ]);
});

Then("I should see a login error message containing {string}", async function (this: CustomWorld, message: string) {
  const auth = new AuthPageHelper(this.page);
  await auth.verifyErrorContains(message);
});

When("I click the logout button", async function (this: CustomWorld) {
  const auth = new AuthPageHelper(this.page);
  await auth.logout();
});

Then("I should be redirected back to the login page", async function (this: CustomWorld) {
  const auth = new AuthPageHelper(this.page);
  await auth.waitForVisible("login-email");
});
