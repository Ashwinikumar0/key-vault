import { When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "./world";
import * as fs from "fs";
import * as path from "path";
import { SecretPageHelper, FieldInput } from "../helpers/page_helpers";

interface ImportField {
  name: string;
  value: string;
  type: "secret" | "plaintext";
}

interface ImportItem {
  name: string;
  itemType: string;
  fields: ImportField[];
}

When("I create a secret named {string} with template {string} and fields:", async function (this: CustomWorld, secretName: string, templateType: string, table) {
  const secretHelper = new SecretPageHelper(this.page);
  const rows = table.hashes() as Record<string, string>[];
  const fields: FieldInput[] = rows.map((r) => ({
    name: r.name,
    value: r.value === "<tempPassword>" ? this.tempPassword : r.value,
    type: r.type as "secret" | "plaintext"
  }));
  await secretHelper.createSecretWithFields(secretName, templateType, fields);
});

When("I click the generate password button", async function (this: CustomWorld) {
  await this.page.click("button:has-text('Generate Password')");
});

When("I toggle the password visibility for field at index {int}", async function (this: CustomWorld, idx: number) {
  const secretHelper = new SecretPageHelper(this.page);
  await secretHelper.togglePasswordVisibility(idx);
});

Then("the field value at index {int} should be visible as text", async function (this: CustomWorld, idx: number) {
  const secretHelper = new SecretPageHelper(this.page);
  await secretHelper.verifyFieldMaskState(idx, false);
});

Then("the field value at index {int} should be masked", async function (this: CustomWorld, idx: number) {
  const secretHelper = new SecretPageHelper(this.page);
  await secretHelper.verifyFieldMaskState(idx, true);
});

When("I click the submit secret button", async function (this: CustomWorld) {
  const secretHelper = new SecretPageHelper(this.page);
  await secretHelper.saveSecret();
});

Then("I should see a secret card for {string}", async function (this: CustomWorld, secretName: string) {
  const secretHelper = new SecretPageHelper(this.page);
  await secretHelper.verifySecretCardVisible(secretName);
});

When("I click the decrypt button on the card for {string}", async function (this: CustomWorld, secretName: string) {
  const secretHelper = new SecretPageHelper(this.page);
  await secretHelper.decryptSecretCard(secretName);
});

Then("I should see the decrypted field values for {string}:", async function (this: CustomWorld, secretName: string, table) {
  const secretHelper = new SecretPageHelper(this.page);
  const rows = table.hashes() as Record<string, string>[];
  const expectedFields = rows.map((r) => ({
    name: r.name,
    value: r.value === "<tempPassword>" ? this.tempPassword : r.value
  }));
  await secretHelper.verifyDecryptedValues(secretName, expectedFields);
});

When("I click the export JSON button", async function (this: CustomWorld) {
  // Capture playwright download event
  const [download] = await Promise.all([
    this.page.waitForEvent("download"),
    this.page.click("[data-testid='export-json-button']")
  ]);

  const downloadPath = path.join(__dirname, "../reports/downloads");
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  const savePath = path.join(downloadPath, download.suggestedFilename());
  await download.saveAs(savePath);
  this.tempPassword = savePath; // reuse tempPassword field or attach to context
});

Then("the downloaded JSON file should contain secrets matching:", async function (this: CustomWorld, table) {
  const filePath = this.tempPassword; // path saved during export
  expect(fs.existsSync(filePath)).toBe(true);

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(fileContent) as ImportItem[];
  expect(Array.isArray(parsed)).toBe(true);

  const expectedRows = table.hashes();
  for (const row of expectedRows) {
    const matched = parsed.find((item: ImportItem) => item.name === row.name && item.itemType === row.itemType);
    expect(matched).toBeDefined();

    const expectedValue = row.value;
    const secretField = matched!.fields.find((f: ImportField) => f.type === "secret");
    expect(secretField).toBeDefined();
    expect(secretField!.value).toBe(expectedValue);
  }
});

When("I click the download template button", async function (this: CustomWorld) {
  const [download] = await Promise.all([
    this.page.waitForEvent("download"),
    this.page.click("[data-testid='download-template-button']")
  ]);
  const downloadPath = path.join(__dirname, "../reports/downloads");
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  const savePath = path.join(downloadPath, download.suggestedFilename());
  await download.saveAs(savePath);
  this.tempPassword = savePath;
});

Then("the downloaded template file should be a valid sample JSON format", async function (this: CustomWorld) {
  const filePath = this.tempPassword;
  expect(fs.existsSync(filePath)).toBe(true);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(fileContent);
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed.length).toBeGreaterThan(0);
  expect(parsed[0].fields).toBeDefined();
});

When("I import secrets from the JSON template with modifications:", async function (this: CustomWorld, table) {
  // Read downloaded template or create a new JSON schema array
  const rows = table.hashes() as Record<string, string>[];
  const importPayload: ImportItem[] = rows.map((r: Record<string, string>) => ({
    name: r.name,
    itemType: r.itemType,
    fields: [
      { name: "Username", value: r.username, type: "plaintext" },
      { name: "Password", value: r.password, type: "secret" }
    ]
  }));

  const importFilePath = path.join(__dirname, "../reports/downloads/import_payload.json");
  const importDir = path.dirname(importFilePath);
  if (!fs.existsSync(importDir)) {
    fs.mkdirSync(importDir, { recursive: true });
  }

  fs.writeFileSync(importFilePath, JSON.stringify(importPayload, null, 2), "utf-8");

  // Set file into file input selector
  await this.page.setInputFiles("[data-testid='import-json-input']", importFilePath);
});

Then("I should see an alert dialog containing {string}", async function (this: CustomWorld, expectedMsg: string) {
  // Wait up to 5 seconds for alert notification messages
  await this.page.waitForTimeout(1000);
  expect(this.latestDialogMessage).toContain(expectedMsg);
});
