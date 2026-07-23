import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "./world";
import { AdminPageHelper, WorkspacePageHelper, getUniqueEmail } from "../helpers/page_helpers";

When("I create a user account with details:", async function (this: CustomWorld, table) {
  const admin = new AdminPageHelper(this.page);
  const row = table.hashes()[0];
  const uniqueEmail = getUniqueEmail(row.email, this.runTimestamp);
  await admin.createUser(uniqueEmail, row.role);
});

When("I record the temporary password generated", async function (this: CustomWorld) {
  const admin = new AdminPageHelper(this.page);
  this.tempPassword = await admin.scrapeTempPasswordAndDone();
});

When("I create a workspace folder named {string}", async function (this: CustomWorld, folderName: string) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.createWorkspace(folderName);
});

Then("I should see the workspace folder named {string} in the sidebar", async function (this: CustomWorld, name: string) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.verifyWorkspaceVisible(name);
});

When("I select the workspace folder named {string}", async function (this: CustomWorld, name: string) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.selectWorkspace(name);
});

When("I rename the workspace folder {string} to {string}", async function (this: CustomWorld, oldName: string, newName: string) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.renameWorkspace(oldName, newName);
});

When("I click delete for the workspace folder {string}", async function (this: CustomWorld, name: string) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.clickDeleteWorkspace(name);
});

Then("I should see the workspace deletion warning dialog", async function (this: CustomWorld) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.verifyCannotDeleteWorkspaceModal();
});

When("I confirm deletion of the workspace folder", async function (this: CustomWorld) {
  const ws = new WorkspacePageHelper(this.page);
  await ws.confirmDeleteWorkspace();
});
