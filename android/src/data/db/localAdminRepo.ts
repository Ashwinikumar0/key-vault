import { Platform } from "react-native";
import { getDatabase, webStorageEngine } from "./database";
import { UserStat, CreateUserResponse } from "@/domain/types";

export const localAdminRepo = {
  createUser: async (email: string, role: string): Promise<CreateUserResponse> => {
    const cleanEmail = email.toLowerCase().trim();
    const tempPassword = `KV-${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
    // Stretched dummy hash
    const authHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    const newUserId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    if (Platform.OS === "web") {
      webStorageEngine.users.push({
        id: newUserId,
        email: cleanEmail,
        role,
        password_hash: authHash,
        created_at: now,
      });
      return {
        user_id: newUserId,
        email: cleanEmail,
        temporary_password: tempPassword,
      };
    }

    const db = await getDatabase();
    await db.runAsync(
      "INSERT INTO users (id, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      [newUserId, cleanEmail, role, authHash, now]
    );

    return {
      user_id: newUserId,
      email: cleanEmail,
      temporary_password: tempPassword,
    };
  },

  getStats: async (): Promise<UserStat[]> => {
    if (Platform.OS === "web") {
      return webStorageEngine.users.map((u) => {
        const userWs = webStorageEngine.workspaces.filter((w) => w.user_id === u.id).map((w) => w.id);
        const secretCount = webStorageEngine.secrets.filter((s) => userWs.includes(s.workspace_id)).length;
        return {
          user_id: u.id,
          email: u.email,
          secret_count: secretCount,
        };
      });
    }

    const db = await getDatabase();
    const users: any[] = await db.getAllAsync("SELECT id, email FROM users");
    const stats: UserStat[] = [];

    for (const u of users) {
      const countRes: any[] = await db.getAllAsync(
        `SELECT COUNT(s.id) as total 
         FROM secrets s 
         JOIN workspaces w ON s.workspace_id = w.id 
         WHERE w.user_id = ?`,
        [u.id]
      );
      stats.push({
        user_id: u.id,
        email: u.email,
        secret_count: countRes[0]?.total || 0,
      });
    }

    return stats;
  },
};
