import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Plus, KeyRound } from "lucide-react-native";
import { Workspace, Secret } from "@/domain/types";
import { useVault } from "@/presentation/hooks/useVault";
import { WorkspaceSelector } from "@/presentation/components/WorkspaceSelector";
import { SecretCard } from "@/presentation/components/SecretCard";
import { SecretModal } from "@/presentation/components/SecretModal";
import { WorkspaceModal } from "@/presentation/components/WorkspaceModal";
import { DeleteModal } from "@/presentation/components/DeleteModal";
import { theme } from "@/presentation/theme";

export const DashboardScreen: React.FC<{ onOpenDeleteAccount: () => void }> = () => {
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    secrets,
    isLoadingSecrets,
    activeWorkspace,
    saveWorkspace,
    saveSecret,
    deleteWorkspace,
    deleteSecret,
  } = useVault();

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

  const handleDeleteWorkspaceClick = (ws: Workspace) => {
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
        await deleteWorkspace(deleteTarget.item.id);
      } else {
        await deleteSecret(deleteTarget.item.id);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      console.warn("Delete action error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <WorkspaceSelector
        workspaces={workspaces || []}
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
        onSave={saveWorkspace}
      />

      {/* Secret Modal */}
      <SecretModal
        visible={isSecretModalOpen}
        onClose={() => setIsSecretModalOpen(false)}
        workspaceId={selectedWorkspaceId || ""}
        secretToEdit={editingSecret}
        onSave={saveSecret}
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
