import { Platform } from "react-native";
import { getDatabase, webStorageEngine } from "./database";
import { Secret } from "@/domain/types";

export const localSecretRepo = {
  list: async (workspaceId: string): Promise<Secret[]> => {
    if (Platform.OS === "web") {
      return webStorageEngine.secrets.filter((s) => s.workspace_id === workspaceId);
    }

    const db = await getDatabase();
    return await db.getAllAsync(
      "SELECT id, workspace_id, secret_name, encrypted_value, iv, created_at FROM secrets WHERE workspace_id = ? ORDER BY created_at DESC",
      [workspaceId]
    );
  },

  create: async (workspaceId: string, name: string, encryptedValue: string, iv: string): Promise<Secret> => {
    const newSecret: Secret = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspace_id: workspaceId,
      secret_name: name,
      encrypted_value: encryptedValue,
      iv,
      created_at: new Date().toISOString(),
    };

    if (Platform.OS === "web") {
      webStorageEngine.secrets.push(newSecret);
      return newSecret;
    }

    const db = await getDatabase();
    await db.runAsync(
      "INSERT INTO secrets (id, workspace_id, secret_name, encrypted_value, iv, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [newSecret.id, newSecret.workspace_id, newSecret.secret_name, newSecret.encrypted_value, newSecret.iv, newSecret.created_at]
    );
    return newSecret;
  },

  update: async (secretId: string, name: string, encryptedValue: string, iv?: string): Promise<Secret> => {
    if (Platform.OS === "web") {
      const found = webStorageEngine.secrets.find((s) => s.id === secretId);
      if (!found) throw new Error("Secret not found");
      found.secret_name = name;
      found.encrypted_value = encryptedValue;
      if (iv) found.iv = iv;
      return found;
    }

    const db = await getDatabase();
    if (iv) {
      await db.runAsync(
        "UPDATE secrets SET secret_name = ?, encrypted_value = ?, iv = ? WHERE id = ?",
        [name, encryptedValue, iv, secretId]
      );
    } else {
      await db.runAsync(
        "UPDATE secrets SET secret_name = ?, encrypted_value = ? WHERE id = ?",
        [name, encryptedValue, secretId]
      );
    }

    const rows: any[] = await db.getAllAsync("SELECT * FROM secrets WHERE id = ?", [secretId]);
    return rows[0];
  },

  delete: async (secretId: string): Promise<void> => {
    if (Platform.OS === "web") {
      webStorageEngine.secrets = webStorageEngine.secrets.filter((s) => s.id !== secretId);
      return;
    }

    const db = await getDatabase();
    await db.runAsync("DELETE FROM secrets WHERE id = ?", [secretId]);
  },
};
