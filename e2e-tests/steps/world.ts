import { setWorldConstructor, World, Before, After, IWorldOptions, setDefaultTimeout } from "@cucumber/cucumber";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Set default step timeout to 20 seconds to prevent slowMo and key derivation timeouts
setDefaultTimeout(20000);

// Load environment variables from the e2e-tests/.env file
dotenv.config({ path: path.join(__dirname, "../.env") });

// Generate a single unique timestamp for this test run session (YYYYMMDDHHMMSS)
const runTimestamp = new Date().toISOString()
  .replace(/[^0-9]/g, "")
  .slice(0, 14);

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  tempPassword = "";
  baseUrl = process.env.BASE_URL || "http://localhost:5173";
  latestDialogMessage = "";
  runTimestamp = runTimestamp;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);

let scenarioCounter = 0;

Before(async function (this: CustomWorld) {
  scenarioCounter++;
  const runDir = path.join(__dirname, `../reports/runs/${runTimestamp}`);
  const videoDir = path.join(runDir, "videos");
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  const profileDir = `/tmp/playwright-profile-${runTimestamp}-${scenarioCounter}`;

  // Launch Playwright Headless Chromium with custom persistent context to treat non-secure origins as secure
  this.context = await chromium.launchPersistentContext(profileDir, {
    headless: false, // Run full browser to support security flags properly
    slowMo: 600, // 600ms delay between actions to slow down video recordings
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 800 }
    },
    args: [
      "--headless=new", // Force the full browser to run in modern headless mode
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--unsafely-treat-insecure-origin-as-secure=${this.baseUrl}`
    ]
  });

  this.browser = this.context.browser() as Browser;
  this.page = this.context.pages()[0] || await this.context.newPage();

  // Forward browser console logs to the test runner terminal for remote debugging
  this.page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE] [${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Inject a visual cursor overlay that tracks mouse movements and flashes on clicks
  await this.page.addInitScript(() => {
    window.addEventListener("DOMContentLoaded", () => {
      const box = document.createElement("div");
      box.id = "playwright-cursor-overlay";
      box.style.position = "fixed";
      box.style.top = "0px";
      box.style.left = "0px";
      box.style.width = "16px";
      box.style.height = "16px";
      box.style.borderRadius = "50%";
      box.style.backgroundColor = "rgba(255, 0, 0, 0.6)";
      box.style.border = "2px solid rgba(255, 255, 255, 0.8)";
      box.style.pointerEvents = "none";
      box.style.zIndex = "99999999";
      box.style.transition = "transform 0.03s ease";
      box.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.8)";
      document.body.appendChild(box);

      document.addEventListener("mousemove", (e) => {
        box.style.transform = `translate(${e.clientX - 8}px, ${e.clientY - 8}px)`;
      });
      document.addEventListener("mousedown", () => {
        box.style.backgroundColor = "rgba(0, 255, 0, 0.8)";
        box.style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.8)";
      });
      document.addEventListener("mouseup", () => {
        box.style.backgroundColor = "rgba(255, 0, 0, 0.6)";
        box.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.8)";
      });
    });
  });

  // Register dialog handler to record dialog text and accept it
  this.page.on("dialog", async (dialog) => {
    this.latestDialogMessage = dialog.message();
    await dialog.accept();
  });
});

After(async function (this: CustomWorld, scenario) {
  if (!this.page) {
    return;
  }
  // Save screenshots directory structure inside the run session folder
  const runDir = path.join(__dirname, `../reports/runs/${runTimestamp}`);
  const screenshotDir = path.join(runDir, "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Generate screenshot file name based on scenario result
  const name = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const status = scenario.result?.status?.toLowerCase() || "unknown";
  const filename = `${status}_${name}_${Date.now()}.png`;
  const filePath = path.join(screenshotDir, filename);

  try {
    const screenshot = await this.page.screenshot({ path: filePath, fullPage: true });
    // Attach to cucumber JSON reports
    this.attach(screenshot, "image/png");
  } catch (err) {
    console.error("Failed to capture scenario screenshot:", err);
  }

  // Capture video metadata before closing session
  const video = this.page.video();
  let videoPath = "";
  if (video) {
    try {
      videoPath = await video.path();
    } catch (err) {
      console.error("Failed to extract video path:", err);
    }
  }

  // Clean up browser context (flushes video buffer to disk)
  await this.page.close();
  await this.context.close();

  // Process the compiled video recording
  if (videoPath && fs.existsSync(videoPath)) {
    const videoDir = path.dirname(videoPath);
    const newVideoPath = path.join(videoDir, `${status}_${name}.webm`);
    try {
      fs.renameSync(videoPath, newVideoPath);
      // Attach video to Cucumber JSON report
      const videoBuffer = fs.readFileSync(newVideoPath);
      this.attach(videoBuffer, "video/webm");
    } catch (err) {
      console.error("Failed to process E2E video recording:", err);
    }
  }
});
