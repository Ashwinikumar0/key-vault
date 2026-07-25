import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Plus, Search, FolderPlus, KeyRound } from "lucide-react-native";
import { Workspace, Secret } from "../../domain/types";
import { api } from "../../data/api";
import { WorkspaceSelector } from "../components/WorkspaceSelector";
import { SecretCard } from "../components/SecretCard";
import { SecretModal } from "../components/SecretModal";
import { WorkspaceModal } from "../components/WorkspaceModal";
import { DeleteModal } from "../components/DeleteModal";
import { theme } from "../theme";

export const DashboardScreen: React.FC<{ onOpenDeleteAccount: () => void }> = ({ onOpenDeleteAccount }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState<boolean>(false);

  // Modals state
  const [isSecretModalOpen, setIsSecretModalOpen] = useState<boolean>(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [renamingWorkspace, setRenamingWorkspace] = useState<Workspace | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "workspace" | "secret";
    item: Workspace | Secret;
    warningMsg?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadWorkspaces = async () => {
    setIsLoadingWorkspaces(true);
    try {
      const data = await api.workspaces.list();
      setWorkspaces(data);
      if (data.length > 0) {
        if (!selectedWorkspaceId || !data.some((w) => w.id === selectedWorkspaceId)) {
          setSelectedWorkspaceId(data[0].id);
        }
      } else {
        setSelectedWorkspaceId(null);
        setSecrets([]);
      }
    } catch (err) {
      console.warn("Failed to fetch workspaces:", err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const loadSecrets = async (wsId: string) => {
    setIsLoadingSecrets(true);
    try {
      const data = await api.secrets.list(wsId);
      setSecrets(data);
    } catch (err) {
      console.warn("Failed to fetch secrets:", err);
      setSecrets([]);
    } finally {
      setIsLoadingSecrets(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspaceId) {
      loadSecrets(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  // Handlers
  const handleSaveWorkspace = async (name: string, renameId?: string) => {
    if (renameId) {
      await api.workspaces.update(renameId, name);
    } else {
      const created = await api.workspaces.create(name);
      setSelectedWorkspaceId(created.id);
    }
    await loadWorkspaces();
  };

  const handleSaveSecret = async (name: string, encryptedValue: string, iv: string, editId?: string) => {
    if (!selectedWorkspaceId) return;
    if (editId) {
      await api.secrets.update(editId, name, encryptedValue, iv);
    } else {
      await api.secrets.create(selectedWorkspaceId, name, encryptedValue, iv);
    }
    await loadSecrets(selectedWorkspaceId);
  };

  const handleDeleteWorkspaceClick = (ws: Workspace) => {
    // If workspace has secrets, show warning modal blocking deletion
    if (secrets.length > 0 && selectedWorkspaceId === ws.id) {
      setDeleteTarget({
        type: "workspace",
        item: ws,
        warningMsg: "Cannot Delete Workspace: Workspace contains active credential(s). Please clear or delete all keys before removing this workspace.",
      });
    } else {
      setDeleteTarget({
        type: "workspace",
        item: ws,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "workspace") {
        await api.workspaces.delete(deleteTarget.item.id);
        setDeleteTarget(null);
        await loadWorkspaces();
      } else {
        await api.secrets.delete(deleteTarget.item.id);
        setDeleteTarget(null);
        if (selectedWorkspaceId) await loadSecrets(selectedWorkspaceId);
      }
    } catch (err: any) {
      console.warn("Delete action error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  return (
    <View style={styles.container}>
      <WorkspaceSelector
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={setSelectedWorkspaceId}
        onCreateWorkspace={() => {
          setRenamingWorkspace(null);
          setIsWorkspaceModalOpen(true);
        }}
        onRenameWorkspace={(ws) => {
          setRenamingWorkspace(ws);
          setIsWorkspaceModalOpen(true);
        }}
        onDeleteWorkspace={handleDeleteWorkspaceClick}
      />

      <View style={styles.vaultHeader}>
        <View style={styles.vaultTitleContainer}>
          <Text style={styles.vaultTitle}>{activeWorkspace?.workspace_name || "Select Workspace"}</Text>
          <Text style={styles.vaultSubtitle}>{secrets.length} Zero-Knowledge Secrets</Text>
        </View>

        {selectedWorkspaceId && (
          <TouchableOpacity
            style={styles.addSecretBtn}
            onPress={() => {
              setEditingSecret(null);
              setIsSecretModalOpen(true);
            }}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.addSecretBtnText}>Add Secret</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoadingSecrets ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : secrets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <KeyRound size={36} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Secrets Stored</Text>
          <Text style={styles.emptySubtitle}>
            {selectedWorkspaceId
              ? "Store client-side encrypted credentials securely inside this workspace."
              : "Create or select a workspace folder above to start storing keys."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={secrets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SecretCard
              secret={item}
              onEdit={(sec) => {
                setEditingSecret(sec);
                setIsSecretModalOpen(true);
              }}
              onDelete={(sec) => {
                setDeleteTarget({ type: "secret", item: sec });
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Workspace Modal */}
      <WorkspaceModal
        visible={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaceToRename={renamingWorkspace}
        onSave={handleSaveWorkspace}
      />

      {/* Secret Modal */}
      <SecretModal
        visible={isSecretModalOpen}
        onClose={() => setIsSecretModalOpen(false)}
        workspaceId={selectedWorkspaceId || ""}
        secretToEdit={editingSecret}
        onSave={handleSaveSecret}
      />

      {/* Delete Confirmation / Warning Modal */}
      <DeleteModal
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.type === "workspace" ? "Delete Workspace" : "Delete Secret"}
        message={
          deleteTarget?.warningMsg ||
          `Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`
        }
        isWarningOnly={!!deleteTarget?.warningMsg}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  vaultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  vaultTitleContainer: {
    flex: 1,
  },
  vaultTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  vaultSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  addSecretBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  addSecretBtnText: {
    fontSize: theme.fontSize.xs,
    color: "#fff",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  listContent: {
    padding: theme.spacing.md,
  },
});
