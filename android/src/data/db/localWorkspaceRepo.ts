import { Platform } from "react-native";
import { getDatabase, webStorageEngine } from "./database";
import { localAuthRepo } from "./localAuthRepo";
import { Workspace } from "@/domain/types";

export const localWorkspaceRepo = {
  list: async (): Promise<Workspace[]> => {
    const user = await localAuthRepo.me();

    if (Platform.OS === "web") {
      return webStorageEngine.workspaces.filter((w) => w.user_id === user.id);
    }

    const db = await getDatabase();
    return await db.getAllAsync(
      "SELECT id, user_id, workspace_name, created_at FROM workspaces WHERE user_id = ? ORDER BY created_at ASC",
      [user.id]
    );
  },

  create: async (name: string): Promise<Workspace> => {
    const user = await localAuthRepo.me();
    const newWs: Workspace = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      workspace_name: name,
      created_at: new Date().toISOString(),
    };

    if (Platform.OS === "web") {
      webStorageEngine.workspaces.push(newWs);
      return newWs;
    }

    const db = await getDatabase();
    await db.runAsync(
      "INSERT INTO workspaces (id, user_id, workspace_name, created_at) VALUES (?, ?, ?, ?)",
      [newWs.id, newWs.user_id, newWs.workspace_name, newWs.created_at]
    );
    return newWs;
  },

  update: async (id: string, name: string): Promise<Workspace> => {
    const user = await localAuthRepo.me();

    if (Platform.OS === "web") {
      const found = webStorageEngine.workspaces.find((w) => w.id === id && w.user_id === user.id);
      if (!found) throw new Error("Workspace not found");
      found.workspace_name = name;
      return found;
    }

    const db = await getDatabase();
    await db.runAsync(
      "UPDATE workspaces SET workspace_name = ? WHERE id = ? AND user_id = ?",
      [name, id, user.id]
    );

    const rows: any[] = await db.getAllAsync("SELECT * FROM workspaces WHERE id = ?", [id]);
    return rows[0];
  },

  delete: async (id: string): Promise<void> => {
    const user = await localAuthRepo.me();

    if (Platform.OS === "web") {
      webStorageEngine.workspaces = webStorageEngine.workspaces.filter(
        (w) => !(w.id === id && w.user_id === user.id)
      );
      webStorageEngine.secrets = webStorageEngine.secrets.filter((s) => s.workspace_id !== id);
      return;
    }

    const db = await getDatabase();
    await db.runAsync("DELETE FROM secrets WHERE workspace_id = ?", [id]);
    await db.runAsync("DELETE FROM workspaces WHERE id = ? AND user_id = ?", [id, user.id]);
  },
};
