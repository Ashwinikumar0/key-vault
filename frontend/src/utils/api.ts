import axios from "axios";

export const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface WorkspaceResponse {
  id: string;
  user_id: string;
  workspace_name: string;
  created_at: string;
}

export interface SecretResponse {
  id: string;
  workspace_id: string;
  secret_name: string;
  encrypted_value: string;
  iv: string;
  created_at: string;
}

export interface UserStatResponse {
  user_id: string;
  email: string;
  secret_count: number;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
  temporary_password: string;
}

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  withCredentials: true, // Critical for automatic HTTP-Only Cookie storage and delivery
});

// Response interceptor to extract custom backend error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data && error.response.data.error) {
      // Reject with standard Error using the backend's JSON error response message
      return Promise.reject(new Error(error.response.data.error));
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    login: async (email: string, authHash: string) => {
      const res = await apiClient.post<UserResponse>("/auth/login", {
        email,
        password: authHash,
      });
      return res.data;
    },
    
    logout: async () => {
      await apiClient.post<void>("/auth/logout");
    },
    
    me: async () => {
      const res = await apiClient.get<UserResponse>("/auth/me");
      return res.data;
    },
  },

  admin: {
    createUser: async (email: string, role: string) => {
      const res = await apiClient.post<CreateUserResponse>("/admin/users", {
        email,
        role,
      });
      return res.data;
    },
    
    getStats: async () => {
      const res = await apiClient.get<UserStatResponse[]>("/admin/stats");
      return res.data;
    },
    
    listUsers: async () => {
      const res = await apiClient.get<UserResponse[]>("/admin/users");
      return res.data;
    },
  },

  workspaces: {
    create: async (workspaceName: string) => {
      const res = await apiClient.post<WorkspaceResponse>("/workspaces", {
        workspace_name: workspaceName,
      });
      return res.data;
    },
    
    list: async () => {
      const res = await apiClient.get<WorkspaceResponse[]>("/workspaces");
      return res.data;
    },
  },

  secrets: {
    create: async (
      workspaceId: string,
      secretName: string,
      encryptedValue: string,
      iv: string
    ) => {
      const res = await apiClient.post<SecretResponse>("/secrets", {
        workspace_id: workspaceId,
        secret_name: secretName,
        encrypted_value: encryptedValue,
        iv,
      });
      return res.data;
    },
    
    list: async (workspaceId: string) => {
      const res = await apiClient.get<SecretResponse[]>(`/secrets/${workspaceId}`);
      return res.data;
    },
  },
};
