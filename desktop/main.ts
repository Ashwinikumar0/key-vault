import { app, BrowserWindow, protocol } from "electron";
import * as path from "path";
import * as http from "http";
import { BackendManager } from "./backend-manager";
import { ProtocolHandler } from "./protocol-handler";

// 1. Register custom scheme as secure, standard, and supporting fetch
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

const backendManager = new BackendManager();
const protocolHandler = new ProtocolHandler();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "KeyVault",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Premium look: Clean frame layout, hide default application menu bar
  mainWindow.setMenuBarVisibility(false);

  // Pipe browser console logs to host terminal
  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[BROWSER CONSOLE] [LEVEL-${level}] ${message} (Source: ${sourceId}:${line})`);
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";

  if (isDev) {
    // Ping the Vite dev server first
    const req = http.get("http://localhost:5173", (res) => {
      mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools();
      res.resume();
    });

    req.on("error", () => {
      // If dev server is offline, load local compiled static files
      mainWindow.loadURL("app://index.html");
    });
  } else {
    // In production mode, load via the secure custom protocol scheme
    mainWindow.loadURL("app://index.html");
  }
}

app.whenReady().then(() => {
  // 1. Spawn backend sidecar service
  backendManager.start();

  // 2. Register custom protocol handler
  protocolHandler.register();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Gracefully terminate Go backend sidecar on window close
  backendManager.stop();
  if (process.platform !== "darwin") app.quit();
});
