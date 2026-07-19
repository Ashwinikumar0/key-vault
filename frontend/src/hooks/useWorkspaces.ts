import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api";
import type { WorkspaceResponse } from "../utils/api";

export function useWorkspaces() {
  const queryClient = useQueryClient();

  const workspacesQuery = useQuery<WorkspaceResponse[]>({
    queryKey: ["workspaces"],
    queryFn: api.workspaces.list,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: (workspaceName: string) => api.workspaces.create(workspaceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  return {
    workspaces: workspacesQuery.data,
    isLoading: workspacesQuery.isLoading,
    createWorkspace: createWorkspaceMutation.mutateAsync, // Can be awaited directly in component
    isCreating: createWorkspaceMutation.isPending,
    error: workspacesQuery.error || createWorkspaceMutation.error,
    resetStatus: createWorkspaceMutation.reset,
  };
}
