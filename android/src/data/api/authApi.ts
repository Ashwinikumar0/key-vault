import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { localAuthRepo } from "../db/localAuthRepo";
import { ENV } from "@/config/env";
import { User } from "@/domain/types";

export const USE_EMBEDDED_DATABASE = ENV.USE_EMBEDDED_DATABASE;

async function loginUser(email: string, authHash: string): Promise<User> {
  if (USE_EMBEDDED_DATABASE) {
    return await localAuthRepo.login(email, authHash);
  }
  const res = await apiClient.post<User>(API_ROUTES.AUTH.LOGIN, { email, password: authHash });
  return res.data;
}

async function logoutUser(): Promise<void> {
  if (USE_EMBEDDED_DATABASE) {
    return await localAuthRepo.logout();
  }
  await apiClient.post(API_ROUTES.AUTH.LOGOUT);
}

async function fetchMe(): Promise<User> {
  if (USE_EMBEDDED_DATABASE) {
    return await localAuthRepo.me();
  }
  const res = await apiClient.get<User>(API_ROUTES.AUTH.ME);
  return res.data;
}

export const authApi = {
  login: loginUser,
  logout: logoutUser,
  me: fetchMe,
};

export { loginUser, logoutUser, fetchMe };
