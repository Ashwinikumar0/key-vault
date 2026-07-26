import { Platform } from "react-native";
import { getDatabase, webStorageEngine } from "./database";
import { User } from "@/domain/types";

let currentActiveUser: User | null = null;

export const localAuthRepo = {
  login: async (email: string, authHash: string): Promise<User> => {
    const cleanEmail = email.toLowerCase().trim();

    if (Platform.OS === "web") {
      const found = webStorageEngine.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!found) {
        throw new Error("Invalid authentication credentials");
      }
      currentActiveUser = {
        id: found.id,
        email: found.email,
        role: found.role as any,
        created_at: found.created_at,
      };
      return currentActiveUser;
    }

    const db = await getDatabase();
    const rows: any[] = await db.getAllAsync(
      "SELECT id, email, role, created_at FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (rows.length === 0) {
      throw new Error("Invalid authentication credentials");
    }

    const u = rows[0];
    currentActiveUser = {
      id: u.id,
      email: u.email,
      role: u.role as any,
      created_at: u.created_at,
    };
    return currentActiveUser;
  },

  logout: async (): Promise<void> => {
    currentActiveUser = null;
  },

  me: async (): Promise<User> => {
    if (!currentActiveUser) {
      throw new Error("Unauthorized");
    }
    return currentActiveUser;
  },

  getCurrentUser: (): User | null => currentActiveUser,
};
