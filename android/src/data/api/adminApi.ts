import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { UserStat, CreateUserResponse } from "@/domain/types";

async function createAdminUser(email: string, role: string): Promise<CreateUserResponse> {
  const res = await apiClient.post<CreateUserResponse>(API_ROUTES.ADMIN.USERS, { email, role });
  return res.data;
}

async function fetchAdminStats(): Promise<UserStat[]> {
  const res = await apiClient.get<UserStat[]>(API_ROUTES.ADMIN.STATS);
  return res.data;
}

export const adminApi = {
  createUser: createAdminUser,
  getStats: fetchAdminStats,
};

export { createAdminUser, fetchAdminStats };
