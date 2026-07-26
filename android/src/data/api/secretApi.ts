import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { localSecretRepo } from "../db/localSecretRepo";
import { USE_EMBEDDED_DATABASE } from "./authApi";
import { Secret } from "@/domain/types";

async function listSecrets(workspaceId: string): Promise<Secret[]> {
  if (USE_EMBEDDED_DATABASE) {
    return await localSecretRepo.list(workspaceId);
  }
  const res = await apiClient.get<Secret[]>(API_ROUTES.SECRETS.BY_WORKSPACE(workspaceId));
  return res.data;
}

async function createSecret(
  workspaceId: string,
  name: string,
  encryptedValue: string,
  iv: string
): Promise<Secret> {
  if (USE_EMBEDDED_DATABASE) {
    return await localSecretRepo.create(workspaceId, name, encryptedValue, iv);
  }
  const res = await apiClient.post<Secret>(API_ROUTES.SECRETS.BASE, {
    workspace_id: workspaceId,
    secret_name: name,
    encrypted_value: encryptedValue,
    iv,
  });
  return res.data;
}

async function updateSecret(
  secretId: string,
  name: string,
  encryptedValue: string,
  iv?: string
): Promise<Secret> {
  if (USE_EMBEDDED_DATABASE) {
    return await localSecretRepo.update(secretId, name, encryptedValue, iv);
  }
  const res = await apiClient.put<Secret>(API_ROUTES.SECRETS.BY_ID(secretId), {
    secret_name: name,
    encrypted_value: encryptedValue,
    iv: iv || "",
  });
  return res.data;
}

async function deleteSecret(secretId: string): Promise<void> {
  if (USE_EMBEDDED_DATABASE) {
    return await localSecretRepo.delete(secretId);
  }
  await apiClient.delete(API_ROUTES.SECRETS.BY_ID(secretId));
}

export const secretApi = {
  list: listSecrets,
  create: createSecret,
  update: updateSecret,
  delete: deleteSecret,
};

export { listSecrets, createSecret, updateSecret, deleteSecret };
