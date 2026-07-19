import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../utils/api";
import type { UserResponse } from "../utils/api";
import { deriveKeys } from "../utils/cryptoUtils";

export function useAuthSession(
  onLoginSuccess: (user: UserResponse, key: CryptoKey) => void,
  onLogoutSuccess: () => void
) {
  const sessionQuery = useQuery<UserResponse | null>({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      try {
        return await api.auth.me();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // 1. Derive client-side credentials
      const { authHash, encryptionKey: derivedKey } = await deriveKeys(password, email);
      // 2. Perform API call to login
      const loggedUser = await api.auth.login(email, authHash);
      return { loggedUser, derivedKey };
    },
    onSuccess: ({ loggedUser, derivedKey }) => {
      onLoginSuccess(loggedUser, derivedKey);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      onLogoutSuccess();
    },
    onError: () => {
      onLogoutSuccess();
    },
  });

  return {
    sessionUser: sessionQuery.data,
    sessionLoading: sessionQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
  };
}
