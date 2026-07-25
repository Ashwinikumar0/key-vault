import { authApi } from "./api/authApi";
import { workspaceApi } from "./api/workspaceApi";
import { secretApi } from "./api/secretApi";
import { userApi } from "./api/userApi";
import { adminApi } from "./api/adminApi";
import { API_ROUTES } from "./api/routes";

export const api = {
  auth: authApi,
  workspaces: workspaceApi,
  secrets: secretApi,
  user: userApi,
  admin: adminApi,
};

export { authApi, workspaceApi, secretApi, userApi, adminApi, API_ROUTES };
