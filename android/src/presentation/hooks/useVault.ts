import { useState, useEffect, useCallback } from "react";
import { Workspace, Secret } from "@/domain/types";
import { workspaceApi } from "@/data/api/workspaceApi";
import { secretApi } from "@/data/api/secretApi";

export function useVault() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState<boolean>(false);

  const loadWorkspaces = useCallback(async () => {
    setIsLoadingWorkspaces(true);
    try {
      const data = await workspaceApi.list();
      const list = Array.isArray(data) ? data : [];
      setWorkspaces(list);
      if (list.length > 0) {
        if (!selectedWorkspaceId || !list.some((w) => w.id === selectedWorkspaceId)) {
          setSelectedWorkspaceId(list[0].id);
        }
      } else {
        setSelectedWorkspaceId(null);
        setSecrets([]);
      }
    } catch (err) {
      console.warn("Failed to fetch workspaces:", err);
      setWorkspaces([]);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [selectedWorkspaceId]);

  const loadSecrets = useCallback(async (wsId: string) => {
    setIsLoadingSecrets(true);
    try {
      const data = await secretApi.list(wsId);
      setSecrets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch secrets:", err);
      setSecrets([]);
    } finally {
      setIsLoadingSecrets(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      loadSecrets(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, loadSecrets]);

  const saveWorkspace = async (name: string, renameId?: string) => {
    if (renameId) {
      await workspaceApi.update(renameId, name);
    } else {
      const created = await workspaceApi.create(name);
      setSelectedWorkspaceId(created.id);
    }
    await loadWorkspaces();
  };

  const saveSecret = async (name: string, encryptedValue: string, iv: string, editId?: string) => {
    if (!selectedWorkspaceId) return;
    if (editId) {
      await secretApi.update(editId, name, encryptedValue, iv);
    } else {
      await secretApi.create(selectedWorkspaceId, name, encryptedValue, iv);
    }
    await loadSecrets(selectedWorkspaceId);
  };

  const deleteWorkspace = async (id: string) => {
    await workspaceApi.delete(id);
    await loadWorkspaces();
  };

  const deleteSecret = async (id: string) => {
    await secretApi.delete(id);
    if (selectedWorkspaceId) {
      await loadSecrets(selectedWorkspaceId);
    }
  };

  const activeWorkspace = (workspaces || []).find((w) => w.id === selectedWorkspaceId);

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    secrets,
    isLoadingWorkspaces,
    isLoadingSecrets,
    activeWorkspace,
    loadWorkspaces,
    loadSecrets,
    saveWorkspace,
    saveSecret,
    deleteWorkspace,
    deleteSecret,
  };
}
