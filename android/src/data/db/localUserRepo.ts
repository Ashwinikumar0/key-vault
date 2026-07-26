import { Platform } from "react-native";
import { getDatabase, webStorageEngine } from "./database";
import { localAuthRepo } from "./localAuthRepo";

export const localUserRepo = {
  deleteAccount: async (): Promise<void> => {
    const user = await localAuthRepo.me();

    if (Platform.OS === "web") {
      const wsIds = webStorageEngine.workspaces.filter((w) => w.user_id === user.id).map((w) => w.id);
      webStorageEngine.secrets = webStorageEngine.secrets.filter((s) => !wsIds.includes(s.workspace_id));
      webStorageEngine.workspaces = webStorageEngine.workspaces.filter((w) => w.user_id !== user.id);
      webStorageEngine.users = webStorageEngine.users.filter((u) => u.id !== user.id);
      await localAuthRepo.logout();
      return;
    }

    const db = await getDatabase();
    const wsRows: any[] = await db.getAllAsync("SELECT id FROM workspaces WHERE user_id = ?", [user.id]);
    for (const ws of wsRows) {
      await db.runAsync("DELETE FROM secrets WHERE workspace_id = ?", [ws.id]);
    }
    await db.runAsync("DELETE FROM workspaces WHERE user_id = ?", [user.id]);
    await db.runAsync("DELETE FROM users WHERE id = ?", [user.id]);
    await localAuthRepo.logout();
  },
};
