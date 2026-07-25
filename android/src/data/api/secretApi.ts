import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { Secret } from "@/domain/types";

async function listSecrets(workspaceId: string): Promise<Secret[]> {
  const res = await apiClient.get<Secret[]>(API_ROUTES.SECRETS.BY_WORKSPACE(workspaceId));
  return res.data;
}

async function createSecret(
  workspaceId: string,
  name: string,
  encryptedValue: string,
  iv: string
): Promise<Secret> {
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
  const res = await apiClient.put<Secret>(API_ROUTES.SECRETS.BY_ID(secretId), {
    secret_name: name,
    encrypted_value: encryptedValue,
    iv: iv || "",
  });
  return res.data;
}

async function deleteSecret(secretId: string): Promise<void> {
  await apiClient.delete(API_ROUTES.SECRETS.BY_ID(secretId));
}

export const secretApi = {
  list: listSecrets,
  create: createSecret,
  update: updateSecret,
  delete: deleteSecret,
};

export { listSecrets, createSecret, updateSecret, deleteSecret };
