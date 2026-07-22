import { contextBridge } from "electron";

// Expose safe, read-only system properties to the React renderer
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: "1.0.0"
});
