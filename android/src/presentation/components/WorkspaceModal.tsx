import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { X } from "lucide-react-native";
import { Workspace } from "../../domain/types";
import { theme } from "../theme";

interface WorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
  workspaceToRename: Workspace | null;
  onSave: (name: string, renameId?: string) => Promise<void>;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  visible,
  onClose,
  workspaceToRename,
  onSave,
}) => {
  const [name, setName] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceToRename && visible) {
      setName(workspaceToRename.workspace_name);
    } else {
      setName("");
    }
    setErrorText(null);
  }, [workspaceToRename, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorText("Workspace name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorText(null);

    try {
      await onSave(name.trim(), workspaceToRename?.id);
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "Failed to save workspace.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{workspaceToRename ? "Rename Workspace" : "New Workspace Folder"}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {errorText && <Text style={styles.errorBanner}>{errorText}</Text>}

          <Text style={styles.label}>Workspace Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Production API Keys"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{workspaceToRename ? "Save Name" : "Create Folder"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  errorBanner: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceCard,
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
