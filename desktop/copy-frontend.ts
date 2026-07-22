import * as fs from "fs";
import * as path from "path";

const src = path.resolve(__dirname, "../../frontend/dist");
const dest = path.resolve(__dirname, "../frontend-dist");

// Recursive copy function
function copyDir(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Make sure target is clean
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

// Check source exists
if (!fs.existsSync(src)) {
  console.error(`Source directory "${src}" does not exist. Make sure to build the frontend first!`);
  process.exit(1);
}

console.log(`Copying built frontend from "${src}" to "${dest}"...`);
copyDir(src, dest);
console.log("Frontend files successfully copied.");
