import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Folder, Plus, Pencil, Trash2 } from "lucide-react-native";
import { Workspace } from "../../domain/types";
import { theme } from "../theme";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: (ws: Workspace) => void;
  onDeleteWorkspace: (ws: Workspace) => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaces,
  selectedWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>WORKSPACES ({workspaces.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onCreateWorkspace}>
          <Plus size={14} color={theme.colors.primary} />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {workspaces.map((ws) => {
          const isSelected = ws.id === selectedWorkspaceId;
          return (
            <View key={ws.id} style={[styles.pill, isSelected && styles.pillSelected]}>
              <TouchableOpacity style={styles.pillMainTouch} onPress={() => onSelectWorkspace(ws.id)}>
                <Folder size={14} color={isSelected ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]} numberOfLines={1}>
                  {ws.workspace_name}
                </Text>
              </TouchableOpacity>

              {isSelected && (
                <View style={styles.pillActions}>
                  <TouchableOpacity style={styles.pillActionBtn} onPress={() => onRenameWorkspace(ws)}>
                    <Pencil size={11} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pillActionBtn} onPress={() => onDeleteWorkspace(ws)}>
                    <Trash2 size={11} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  addBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
  },
  pillSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  pillMainTouch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  pillTextSelected: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  pillActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  pillActionBtn: {
    padding: 3,
  },
});
