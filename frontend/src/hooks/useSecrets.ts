import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api";
import type { SecretResponse } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { encryptData } from "../utils/cryptoUtils";

export function useSecrets(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const { encryptionKey } = useAuth();

  const secretsQuery = useQuery<SecretResponse[]>({
    queryKey: ["secrets", workspaceId],
    queryFn: () => api.secrets.list(workspaceId || ""),
    enabled: !!workspaceId,
  });

  const createSecretMutation = useMutation({
    mutationFn: async ({ name, value }: { name: string; value: string }) => {
      if (!workspaceId) {
        throw new Error("No active workspace selected.");
      }
      if (!encryptionKey) {
        throw new Error("Security keys missing from memory. Please log in again.");
      }

      const encrypted = await encryptData(value, encryptionKey);
      return api.secrets.create(workspaceId, name, encrypted.ciphertext, encrypted.iv);
    },
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: ["secrets", workspaceId] });
      }
    },
  });

  return {
    secrets: secretsQuery.data,
    isLoading: secretsQuery.isLoading,
    createSecret: createSecretMutation.mutate,
    createSecretAsync: createSecretMutation.mutateAsync,
    isCreating: createSecretMutation.isPending,
    error: secretsQuery.error || createSecretMutation.error,
    resetStatus: createSecretMutation.reset,
  };
}
