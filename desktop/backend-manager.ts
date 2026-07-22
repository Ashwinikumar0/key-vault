import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import type { ChildProcess } from "child_process";

export class BackendManager {
  private backendProcess: ChildProcess | null = null;

  public start(): void {
    let backendPath = "";
    
    if (app.isPackaged) {
      backendPath = path.join(process.resourcesPath, "bin", "key-vault-backend.exe");
    } else {
      backendPath = path.join(__dirname, "../bin", "key-vault-backend.exe");
    }

    if (!fs.existsSync(backendPath)) {
      console.error(`[BACKEND MANAGER] Sidecar binary not found at: ${backendPath}`);
      return;
    }

    console.log(`[BACKEND MANAGER] Spawning backend sidecar: ${backendPath}`);

    // Resolve dynamic default SQLite database path in local user AppData
    let sqlitePath = "";
    try {
      const userDir = app.getPath("userData");
      sqlitePath = path.join(userDir, "Database", "keyvault.db");
    } catch (e) {
      console.error("[BACKEND MANAGER] Failed to resolve userData directory for SQLite:", e);
    }

    // Identify and load the custom .env configuration file
    const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
    const envPath = isDev 
      ? path.join(__dirname, "../.env") 
      : path.join(path.dirname(process.execPath), ".env");

    console.log(`[BACKEND MANAGER] Loading environment configurations from: ${envPath}`);
    const userEnv = loadEnvFile(envPath);

    // Apply safe defaults, then overwrite with user .env settings
    const defaultEnv = {
      DB_DRIVER: "sqlite",
      SQLITE_DB_PATH: sqlitePath,
      PORT: "8080",
      JWT_SECRET: "key-vault-super-secure-dev-jwt-secret-key-123456",
      CORS_ALLOWED_ORIGINS: "app://index.html,http://localhost:5173",
      DEFAULT_ADMIN_EMAIL: "admin@keyvault.local",
      DEFAULT_ADMIN_PASSWORD: "adminpassword123"
    };

    const env = {
      ...process.env,
      ...defaultEnv,
      ...userEnv
    };

    try {
      this.backendProcess = spawn(backendPath, [], { env });

      this.backendProcess.stdout?.on("data", (data) => {
        console.log(`[BACKEND STDOUT] ${data.toString().trim()}`);
      });

      this.backendProcess.stderr?.on("data", (data) => {
        console.error(`[BACKEND STDERR] ${data.toString().trim()}`);
      });

      this.backendProcess.on("close", (code) => {
        console.log(`[BACKEND MANAGER] Process exited with code ${code}`);
      });
      
      this.backendProcess.on("error", (err) => {
        console.error("[BACKEND MANAGER] Failed to start process:", err);
      });
    } catch (err) {
      console.error("[BACKEND MANAGER] Error spawning sidecar:", err);
    }
  }

  public stop(): void {
    if (this.backendProcess) {
      console.log("[BACKEND MANAGER] Killing sidecar process...");
      this.backendProcess.kill();
      this.backendProcess = null;
    }
  }
}

/**
 * Pure Node.js helper to parse standard .env file key-value pairs
 */
function loadEnvFile(filePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  if (!fs.existsSync(filePath)) {
    return envVars;
  }
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        
        // Strip surrounding double/single quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        
        envVars[key] = val;
      }
    }
  } catch (err) {
    console.error(`[BACKEND MANAGER] Error reading env file at ${filePath}:`, err);
  }
  
  return envVars;
}
