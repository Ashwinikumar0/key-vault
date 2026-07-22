import * as fs from "fs";
import * as path from "path";

console.log("Cleaning local development SQLite database for a clean build...");

const appData = process.env.APPDATA || 
  (process.platform === "darwin" 
    ? path.join(process.env.HOME || "", "Library/Application Support") 
    : path.join(process.env.HOME || "", ".config"));

const dbDir = path.join(appData, "key-vault-desktop");

if (fs.existsSync(dbDir)) {
  try {
    fs.rmSync(dbDir, { recursive: true, force: true });
    console.log(`Successfully cleared local database directory at: ${dbDir}`);
  } catch (err: any) {
    console.error(`Failed to clear local database directory: ${err.message}`);
  }
} else {
  console.log("No local database directory found to clean.");
}
