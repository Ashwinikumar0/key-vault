import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Shield, UserPlus, Users, Key } from "lucide-react-native";
import { useAdmin } from "@/presentation/hooks/useAdmin";
import { theme } from "@/presentation/theme";

export const AdminScreen: React.FC = () => {
  const {
    stats,
    isLoading,
    isCreating,
    tempPasswordResult,
    errorText,
    createUser,
  } = useAdmin();

  const [newEmail, setNewEmail] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("user");

  const handleCreateUser = async () => {
    try {
      await createUser(newEmail, newRole);
      setNewEmail("");
    } catch {
      // Error handled within hook
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={20} color={theme.colors.primary} />
        <Text style={styles.headerTitle}>System Administration</Text>
      </View>

      <View style={styles.createCard}>
        <View style={styles.cardTitleRow}>
          <UserPlus size={16} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Provision User Account</Text>
        </View>

        {errorText && <Text style={styles.errorText}>{errorText}</Text>}

        {tempPasswordResult && (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>User Account Created Successfully!</Text>
            <Text style={styles.tempPwdLabel}>Temporary Master Password:</Text>
            <Text style={styles.tempPwdText}>{tempPasswordResult}</Text>
          </View>
        )}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="operator@keyvault.local"
          placeholderTextColor={theme.colors.textMuted}
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {["user", "admin"].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleChip, newRole === r && styles.roleChipSelected]}
              onPress={() => setNewRole(r)}
            >
              <Text style={[styles.roleChipText, newRole === r && styles.roleChipTextSelected]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreateUser} disabled={isCreating}>
          {isCreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsHeader}>
        <Users size={16} color={theme.colors.textMuted} />
        <Text style={styles.statsTitle}>User Metrics ({stats.length})</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={stats}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <View style={styles.userStatRow}>
              <View style={styles.userStatDetails}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userIdText}>ID: {item.user_id}</Text>
              </View>
              <View style={styles.secretCountBadge}>
                <Key size={12} color={theme.colors.primary} />
                <Text style={styles.secretCountText}>{item.secret_count} Keys</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  createCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginBottom: theme.spacing.xs,
  },
  successBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: theme.colors.success,
    borderWidth: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  successTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: "700",
    color: theme.colors.success,
    marginBottom: 4,
  },
  tempPwdLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  tempPwdText: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
    fontFamily: "monospace",
  },
  label: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleChipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  roleChipTextSelected: {
    color: theme.colors.primary,
  },
  createBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    alignItems: "center",
  },
  createBtnText: {
    color: "#fff",
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  statsTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  listContent: {
    gap: theme.spacing.xs,
  },
  userStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceCard,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userStatDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
  },
  userIdText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  secretCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  secretCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});
