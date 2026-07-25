import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { User } from "@/domain/types";

async function loginUser(email: string, authHash: string): Promise<User> {
  const res = await apiClient.post<User>(API_ROUTES.AUTH.LOGIN, { email, password: authHash });
  return res.data;
}

async function logoutUser(): Promise<void> {
  await apiClient.post(API_ROUTES.AUTH.LOGOUT);
}

async function fetchMe(): Promise<User> {
  const res = await apiClient.get<User>(API_ROUTES.AUTH.ME);
  return res.data;
}

export const authApi = {
  login: loginUser,
  logout: logoutUser,
  me: fetchMe,
};

export { loginUser, logoutUser, fetchMe };
