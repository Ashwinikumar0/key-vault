import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { AlertTriangle, Trash2, X } from "lucide-react-native";
import { theme } from "@/presentation/theme";

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  isWarningOnly?: boolean;
  onConfirm?: () => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  visible,
  onClose,
  title,
  message,
  isWarningOnly = false,
  onConfirm,
  isDeleting = false,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <View style={styles.iconTitleRow}>
              <AlertTriangle size={18} color={isWarningOnly ? theme.colors.warning : theme.colors.danger} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.messageText}>{message}</Text>

          <View style={styles.modalFooter}>
            {isWarningOnly ? (
              <TouchableOpacity style={styles.gotItBtn} onPress={onClose}>
                <Text style={styles.gotItBtnText}>Got It</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isDeleting}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={onConfirm} disabled={isDeleting}>
                  {isDeleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Trash2 size={14} color="#fff" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    marginBottom: theme.spacing.xs,
  },
  iconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  modalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  messageText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  gotItBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  gotItBtnText: {
    color: "#fff",
    fontWeight: "600",
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
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.danger,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
