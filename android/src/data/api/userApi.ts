import { apiClient } from "./client";
import { API_ROUTES } from "./routes";
import { localUserRepo } from "../db/localUserRepo";
import { USE_EMBEDDED_DATABASE } from "./authApi";

async function deleteUserAccount(): Promise<void> {
  if (USE_EMBEDDED_DATABASE) {
    return await localUserRepo.deleteAccount();
  }
  await apiClient.delete(API_ROUTES.USER.ACCOUNT);
}

export const userApi = {
  deleteAccount: deleteUserAccount,
};

export { deleteUserAccount };
