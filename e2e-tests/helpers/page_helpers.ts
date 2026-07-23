import { Page, Locator, expect } from "@playwright/test";

export function getUniqueEmail(email: string, runTimestamp: string): string {
  if (email === "admin@keyvault.local") {
    return email;
  }
  const [username, domain] = email.split("@");
  return `${username}_${runTimestamp}@${domain}`;
}

// ==========================================
// Base Web Utilities (Data Selector Engine)
// ==========================================

export class BasePage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  locator(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  async fill(testId: string, value: string): Promise<void> {
    const el = this.locator(testId);
    await el.waitFor({ state: "visible" });
    await el.focus();
    await el.clear();
    await el.fill(value);
    // Verify the filled value and retry if overridden by browser/React lifecycle
    const currentValue = await el.inputValue();
    if (currentValue !== value) {
      await el.fill(value);
    }
  }

  async click(testId: string): Promise<void> {
    const el = this.locator(testId);
    await el.waitFor({ state: "visible" });
    await el.click();
  }

  async select(testId: string, value: string): Promise<void> {
    const el = this.locator(testId);
    await el.waitFor({ state: "visible" });
    await el.selectOption({ value });
  }

  async waitForVisible(testId: string, timeout = 10000): Promise<void> {
    await this.locator(testId).waitFor({ state: "visible", timeout });
  }
}

// ==========================================
// 1. Authentication Page Helper
// ==========================================

export class AuthPageHelper extends BasePage {
  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForVisible("login-email");
    // Wait for React hydration/state prefill to complete before typing
    await expect(this.locator("login-email")).toHaveValue("admin@keyvault.local", { timeout: 5000 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill("login-email", email);
    await this.fill("login-password", password);
    await this.click("login-submit");
  }

  async verifyErrorContains(expectedText: string): Promise<void> {
    await this.waitForVisible("login-error");
    const text = await this.locator("login-error").textContent();
    expect(text).toContain(expectedText);
  }

  async logout(): Promise<void> {
    await this.page.click("button:has-text('Logout')");
  }

  async deleteAccount(): Promise<void> {
    await this.page.click("button:has-text('Delete My Data & Account')");
    await this.page.click("button:has-text('Permanently Delete My Data')");
  }
}

// ==========================================
// 2. User Administration Page Helper
// ==========================================

export class AdminPageHelper extends BasePage {
  async createUser(email: string, role: string): Promise<void> {
    if (!this.page.url().includes("/admin")) {
      await this.click("admin-panel-link");
    }
    await this.click("create-user-trigger");
    await this.fill("user-email-input", email);
    await this.select("user-role-select", role);
    await this.click("user-submit");
  }

  async scrapeTempPasswordAndDone(): Promise<string> {
    await this.waitForVisible("temp-password-display");
    const pwd = await this.locator("temp-password-display").textContent();
    expect(pwd).not.toBeNull();
    // Close user creation modal
    await this.page.click("button:has-text('Done')");
    return pwd ? pwd.trim() : "";
  }
}

// ==========================================
// 3. Workspaces Directory Page Helper
// ==========================================

export class WorkspacePageHelper extends BasePage {
  async createWorkspace(name: string): Promise<void> {
    const isEmpty = await this.page.isVisible("[data-testid='create-workspace-trigger-empty']");
    if (isEmpty) {
      await this.click("create-workspace-trigger-empty");
    } else {
      await this.click("create-workspace-trigger");
    }
    await this.fill("workspace-name-input", name);
    await this.click("workspace-name-submit");
  }

  async verifyWorkspaceVisible(name: string): Promise<void> {
    const selector = `[data-testid='workspace-item']:has-text('${name}')`;
    await this.page.waitForSelector(selector, { state: "visible" });
  }

  async selectWorkspace(name: string): Promise<void> {
    const selector = `[data-testid='workspace-item']:has-text('${name}')`;
    await this.page.click(selector);
  }

  async renameWorkspace(oldName: string, newName: string): Promise<void> {
    const item = this.page.locator("[data-testid='workspace-item']", { hasText: oldName });
    const row = this.page.locator("div", { has: item }).first();
    await row.locator("[data-testid='rename-workspace-trigger']").click();
    await this.fill("rename-workspace-name-input", newName);
    await this.click("rename-workspace-submit");
  }

  async clickDeleteWorkspace(name: string): Promise<void> {
    const item = this.page.locator("[data-testid='workspace-item']", { hasText: name });
    const row = this.page.locator("div", { has: item }).first();
    await row.locator("[data-testid='delete-workspace-trigger']").click();
  }

  async confirmDeleteWorkspace(): Promise<void> {
    await this.click("confirm-delete-workspace");
  }

  async verifyCannotDeleteWorkspaceModal(): Promise<void> {
    await expect(this.page.locator("text=Cannot Delete Workspace")).toBeVisible();
    await this.page.click("button:has-text('Got It')");
  }
}

// ==========================================
// 4. Secrets Vault Page Helper
// ==========================================

export interface FieldInput {
  name: string;
  value: string;
  type: "secret" | "plaintext";
}

export class SecretPageHelper extends BasePage {
  async createSecretWithFields(secretName: string, templateType: string, fields: FieldInput[]): Promise<void> {
    await this.click("add-secret-trigger");
    await this.fill("secret-name-input", secretName);
    await this.select("item-type-select", templateType);

    // Remove any extra default template field rows if count > fields.length
    while ((await this.locator("field-name-input").count()) > fields.length) {
      const removeBtns = this.locator("field-remove");
      if ((await removeBtns.count()) > 0) {
        await removeBtns.last().click();
      } else {
        break;
      }
    }

    for (let idx = 0; idx < fields.length; idx++) {
      const field = fields[idx];

      const nameInputs = this.locator("field-name-input");
      const currentCount = await nameInputs.count();
      if (idx >= currentCount) {
        await this.click("field-add-button");
      }

      await nameInputs.nth(idx).fill(field.name);
      await this.locator("field-type-select").nth(idx).selectOption({ value: field.type });
      await this.locator("field-value-input").nth(idx).fill(field.value);
    }
  }

  async togglePasswordVisibility(fieldIndex: number): Promise<void> {
    const container = this.page.locator("div:has(> [data-testid='field-value-input'])").nth(fieldIndex);
    await container.locator("[data-testid='field-eye-toggle']").click();
  }

  async verifyFieldMaskState(fieldIndex: number, isMasked: boolean): Promise<void> {
    const inputType = await this.locator("field-value-input").nth(fieldIndex).getAttribute("type");
    expect(inputType).toBe(isMasked ? "password" : "text");
  }

  async saveSecret(): Promise<void> {
    await this.click("secret-submit");
  }

  async editSecret(secretName: string, newName: string): Promise<void> {
    const card = this.page.locator("[data-testid='secret-card']", { hasText: secretName });
    await card.locator("[data-testid='edit-secret-button']").click();
    await this.fill("edit-secret-name-input", newName);
    await this.click("save-edited-secret-button");
  }

  async deleteSecret(secretName: string): Promise<void> {
    const card = this.page.locator("[data-testid='secret-card']", { hasText: secretName });
    await card.locator("[data-testid='delete-secret-button']").click();
    await this.click("confirm-delete-secret");
  }

  async verifySecretCardVisible(secretName: string): Promise<void> {
    const selector = `[data-testid='secret-card']:has-text('${secretName}')`;
    await this.page.waitForSelector(selector, { state: "visible" });
  }

  async verifySecretCardNotVisible(secretName: string): Promise<void> {
    const selector = `[data-testid='secret-card']:has-text('${secretName}')`;
    await expect(this.page.locator(selector)).toHaveCount(0);
  }

  async decryptSecretCard(secretName: string): Promise<void> {
    const card = this.page.locator("[data-testid='secret-card']", { hasText: secretName });
    await card.locator("[data-testid='decrypt-card-button']").click();
  }

  async verifyDecryptedValues(secretName: string, fields: { name: string; value: string }[]): Promise<void> {
    const card = this.page.locator("[data-testid='secret-card']", { hasText: secretName });

    for (const row of fields) {
      const label = card.locator(`.form-label:has-text('${row.name}')`).first();
      await expect(label).toBeVisible();

      const parentDiv = card.locator(`div:has(> .form-label:has-text('${row.name}'))`).first();
      
      // If the field is masked (has a "Show field value" eye button), click it to reveal the secret text
      const revealBtn = parentDiv.locator("button[title='Show field value']");
      if (await revealBtn.count() > 0) {
        await revealBtn.click();
      }

      const valueEl = parentDiv.locator("[data-testid='secret-field-value']");
      await expect(valueEl).toBeVisible();

      const actualText = await valueEl.textContent();
      expect(actualText?.trim()).toBe(row.value);
    }
  }
}
