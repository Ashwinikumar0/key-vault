export const API_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
  WORKSPACES: {
    BASE: "/workspaces",
    BY_ID: (id: string) => `/workspaces/${id}`,
  },
  SECRETS: {
    BASE: "/secrets",
    BY_WORKSPACE: (workspaceId: string) => `/secrets/${workspaceId}`,
    BY_ID: (secretId: string) => `/secrets/${secretId}`,
  },
  USER: {
    ACCOUNT: "/user/account",
  },
  ADMIN: {
    USERS: "/admin/users",
    STATS: "/admin/stats",
  },
} as const;
