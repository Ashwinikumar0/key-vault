import { apiClient } from "./client";
import { API_ROUTES } from "./routes";

async function deleteUserAccount(): Promise<void> {
  await apiClient.delete(API_ROUTES.USER.ACCOUNT);
}

export const userApi = {
  deleteAccount: deleteUserAccount,
};

export { deleteUserAccount };
