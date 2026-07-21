const report = require("multiple-cucumber-html-reporter");
const fs = require("fs");
const path = require("path");

const reportsDir = path.join(__dirname, "reports/json");

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const files = fs.readdirSync(reportsDir);
files.forEach(file => {
  if (file.endsWith(".json")) {
    const filePath = path.join(reportsDir, file);
    try {
      const rawData = fs.readFileSync(filePath, "utf-8");
      if (rawData.trim()) {
        let data = JSON.parse(rawData);
        if (Array.isArray(data)) {
          const cleaned = data.filter(feature => feature && typeof feature === "object" && typeof feature.uri === "string");
          fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
          console.log(`Sanitized JSON report file '${file}': kept ${cleaned.length} of ${data.length} features.`);
        }
      }
    } catch (err) {
      console.error(`Failed to sanitize JSON report file '${file}':`, err);
    }
  }
});

report.generate({
  jsonDir: "./reports/json/",
  reportPath: "./reports/html/",
  metadata: {
    browser: {
      name: "chromium",
      version: "Playwright Headless"
    },
    device: "Docker Container Test Environment",
    platform: {
      name: "linux"
    }
  },
  customData: {
    title: "KeyVault E2E Automation Run Info",
    data: [
      { label: "Project", value: "KeyVault Zero-Knowledge Crypt System" },
      { label: "Environment", value: "Docker Node Network Stack" },
      { label: "Suite", value: "Cucumber Playwright BDD" }
    ]
  }
});
