import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const binDir = path.resolve(__dirname, "../bin");
const backendDir = path.resolve(__dirname, "../../backend");
const outputBinName = "key-vault-backend.exe";
const outputBinPath = path.join(binDir, outputBinName);

// Ensure bin directory exists
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log("Compiling Go backend for Windows sidecar...");
try {
  execSync(`go build -o "${outputBinPath}" cmd/api/main.go`, {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, GOOS: "windows", GOARCH: "amd64" }
  });
  console.log(`Go backend successfully compiled to "${outputBinPath}".`);
} catch (error: any) {
  console.error("Failed to compile Go backend:", error.message);
  process.exit(1);
}
