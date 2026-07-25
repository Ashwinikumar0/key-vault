import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Shield, LogOut, Trash2, KeyRound } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";
import { UserRole } from "../../domain/types";

interface HeaderProps {
  currentView: "dashboard" | "admin";
  onToggleView: (view: "dashboard" | "admin") => void;
  onOpenDeleteAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onToggleView, onOpenDeleteAccount }) => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoContainer}>
          <KeyRound size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>KeyVault</Text>
        {user?.role === UserRole.ADMIN && (
          <View style={styles.adminBadge}>
            <Shield size={10} color={theme.colors.primary} />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        {user?.role === UserRole.ADMIN && (
          <TouchableOpacity
            style={[styles.actionBtn, currentView === "admin" && styles.actionBtnActive]}
            onPress={() => onToggleView(currentView === "dashboard" ? "admin" : "dashboard")}
          >
            <Shield size={16} color={currentView === "admin" ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.actionBtnText, currentView === "admin" && styles.actionBtnTextActive]}>
              {currentView === "admin" ? "Vault" : "Admin"}
            </Text>
          </TouchableOpacity>
        )}

        {user?.role !== UserRole.ADMIN && (
          <TouchableOpacity style={styles.dangerBtn} onPress={onOpenDeleteAccount}>
            <Trash2 size={16} color={theme.colors.danger} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginLeft: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  actionBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  actionBtnTextActive: {
    color: theme.colors.primary,
  },
  dangerBtn: {
    padding: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.dangerLight,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceCard,
  },
});
