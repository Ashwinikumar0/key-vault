import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { ENV } from "@/config/env";

let dbInstance: any = null;

// Memory storage fallback for Web / Expo Web environment
const webStorage = {
  users: [
    {
      id: "admin-uuid-0000-0000-000000000001",
      email: ENV.DEFAULT_ADMIN_EMAIL,
      role: "admin",
      password_hash: ENV.DEFAULT_ADMIN_AUTH_HASH,
      created_at: new Date().toISOString(),
    },
  ],
  workspaces: [
    {
      id: "ws-default-001",
      user_id: "admin-uuid-0000-0000-000000000001",
      workspace_name: "Personal Secrets",
      created_at: new Date().toISOString(),
    },
  ],
  secrets: [] as any[],
};

export async function getDatabase() {
  if (Platform.OS === "web") {
    return null;
  }
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("keyvault_mobile.db");
  }
  return dbInstance;
}

export async function initLocalDatabase(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const db = await getDatabase();

  // Create SQLite Tables for Standalone Mobile App
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS secrets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      secret_name TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin account if table is empty
  const existingUsers: any[] = await db.getAllAsync("SELECT * FROM users WHERE email = ?", [
    ENV.DEFAULT_ADMIN_EMAIL,
  ]);

  if (existingUsers.length === 0) {
    const adminId = "admin-uuid-0000-0000-000000000001";
    const now = new Date().toISOString();

    await db.runAsync(
      "INSERT INTO users (id, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      [adminId, ENV.DEFAULT_ADMIN_EMAIL, "admin", ENV.DEFAULT_ADMIN_AUTH_HASH, now]
    );

    await db.runAsync(
      "INSERT INTO workspaces (id, user_id, workspace_name, created_at) VALUES (?, ?, ?, ?)",
      ["ws-default-001", adminId, "Personal Secrets", now]
    );
  }
}

export const webStorageEngine = webStorage;
