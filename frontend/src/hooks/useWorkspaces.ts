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

  const updateWorkspaceMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.workspaces.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (id: string) => api.workspaces.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  return {
    workspaces: workspacesQuery.data,
    isLoading: workspacesQuery.isLoading,
    createWorkspace: createWorkspaceMutation.mutateAsync,
    isCreating: createWorkspaceMutation.isPending,
    updateWorkspace: updateWorkspaceMutation.mutateAsync,
    isUpdating: updateWorkspaceMutation.isPending,
    deleteWorkspace: deleteWorkspaceMutation.mutateAsync,
    isDeleting: deleteWorkspaceMutation.isPending,
    error: workspacesQuery.error || createWorkspaceMutation.error || updateWorkspaceMutation.error || deleteWorkspaceMutation.error,
    resetStatus: createWorkspaceMutation.reset,
  };
}
