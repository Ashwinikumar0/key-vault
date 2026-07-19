import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api";
import type { UserResponse, UserStatResponse } from "../utils/api";

export function useAdmin() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery<UserResponse[]>({
    queryKey: ["admin", "users"],
    queryFn: api.admin.listUsers,
  });

  const statsQuery = useQuery<UserStatResponse[]>({
    queryKey: ["admin", "stats"],
    queryFn: api.admin.getStats,
  });

  const createUserMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.admin.createUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  return {
    users: usersQuery.data,
    stats: statsQuery.data,
    isLoading: usersQuery.isLoading || statsQuery.isLoading,
    createUser: createUserMutation.mutate,
    isCreating: createUserMutation.isPending,
    error: usersQuery.error || statsQuery.error || createUserMutation.error,
    createdUserData: createUserMutation.data,
    resetStatus: createUserMutation.reset,
  };
}
