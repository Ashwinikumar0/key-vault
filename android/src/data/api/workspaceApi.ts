import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { Workspace } from "@/domain/types";

async function listWorkspaces(): Promise<Workspace[]> {
  const res = await apiClient.get<Workspace[]>(API_ROUTES.WORKSPACES.BASE);
  return res.data;
}

async function createWorkspace(name: string): Promise<Workspace> {
  const res = await apiClient.post<Workspace>(API_ROUTES.WORKSPACES.BASE, { workspace_name: name });
  return res.data;
}

async function updateWorkspace(id: string, name: string): Promise<Workspace> {
  const res = await apiClient.put<Workspace>(API_ROUTES.WORKSPACES.BY_ID(id), { workspace_name: name });
  return res.data;
}

async function deleteWorkspace(id: string): Promise<void> {
  await apiClient.delete(API_ROUTES.WORKSPACES.BY_ID(id));
}

export const workspaceApi = {
  list: listWorkspaces,
  create: createWorkspace,
  update: updateWorkspace,
  delete: deleteWorkspace,
};

export { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace };
