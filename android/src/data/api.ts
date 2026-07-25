import axios from "axios";
import { User, Workspace, Secret, UserStat, CreateUserResponse } from "../domain/types";

// Standard Android emulator localhost loopback address: 10.0.2.2 (or http://localhost:8080/api for local testing)
const API_BASE_URL = "http://10.0.2.2:8080/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    login: async (email: string, authHash: string): Promise<User> => {
      const res = await apiClient.post<User>("/auth/login", { email, password: authHash });
      return res.data;
    },
    logout: async (): Promise<void> => {
      await apiClient.post("/auth/logout");
    },
    me: async (): Promise<User> => {
      const res = await apiClient.get<User>("/auth/me");
      return res.data;
    },
  },

  workspaces: {
    list: async (): Promise<Workspace[]> => {
      const res = await apiClient.get<Workspace[]>("/workspaces");
      return res.data;
    },
    create: async (name: string): Promise<Workspace> => {
      const res = await apiClient.post<Workspace>("/workspaces", { workspace_name: name });
      return res.data;
    },
    update: async (id: string, name: string): Promise<Workspace> => {
      const res = await apiClient.put<Workspace>(`/workspaces/${id}`, { workspace_name: name });
      return res.data;
    },
    delete: async (id: string): Promise<void> => {
      await apiClient.delete(`/workspaces/${id}`);
    },
  },

  secrets: {
    list: async (workspaceId: string): Promise<Secret[]> => {
      const res = await apiClient.get<Secret[]>(`/secrets/${workspaceId}`);
      return res.data;
    },
    create: async (workspaceId: string, name: string, encryptedValue: string, iv: string): Promise<Secret> => {
      const res = await apiClient.post<Secret>("/secrets", {
        workspace_id: workspaceId,
        secret_name: name,
        encrypted_value: encryptedValue,
        iv,
      });
      return res.data;
    },
    update: async (secretId: string, name: string, encryptedValue: string, iv?: string): Promise<Secret> => {
      const res = await apiClient.put<Secret>(`/secrets/${secretId}`, {
        secret_name: name,
        encrypted_value: encryptedValue,
        iv: iv || "",
      });
      return res.data;
    },
    delete: async (secretId: string): Promise<void> => {
      await apiClient.delete(`/secrets/${secretId}`);
    },
  },

  user: {
    deleteAccount: async (): Promise<void> => {
      await apiClient.delete("/user/account");
    },
  },

  admin: {
    createUser: async (email: string, role: string): Promise<CreateUserResponse> => {
      const res = await apiClient.post<CreateUserResponse>("/admin/users", { email, role });
      return res.data;
    },
    getStats: async (): Promise<UserStat[]> => {
      const res = await apiClient.get<UserStat[]>("/admin/stats");
      return res.data;
    },
  },
};
