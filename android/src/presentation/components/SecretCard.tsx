import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Lock, Unlock, Eye, EyeOff, Pencil, Trash2, KeyRound } from "lucide-react-native";
import { Secret, CustomField, SecretPayload } from "@/domain/types";
import { decryptData } from "@/domain/crypto";
import { useAuth } from "@/presentation/context/AuthContext";
import { theme } from "@/presentation/theme";

interface SecretCardProps {
  secret: Secret;
  onEdit: (secret: Secret) => void;
  onDelete: (secret: Secret) => void;
}

export const SecretCard: React.FC<SecretCardProps> = ({ secret, onEdit, onDelete }) => {
  const { encryptionKey } = useAuth();
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptedFields, setDecryptedFields] = useState<CustomField[]>([]);
  const [itemType, setItemType] = useState<string>("api");
  const [visibleMasks, setVisibleMasks] = useState<Record<number, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDecryptToggle = async () => {
    if (isDecrypted) {
      setIsDecrypted(false);
      return;
    }

    if (!encryptionKey) {
      setErrorMsg("Crypto key missing. Please re-login.");
      return;
    }

    setIsDecrypting(true);
    setErrorMsg(null);

    try {
      const plaintext = await decryptData(secret.encrypted_value, secret.iv, encryptionKey);
      try {
        const parsed = JSON.parse(plaintext) as SecretPayload;
        if (parsed && typeof parsed === "object" && "fields" in parsed) {
          setItemType(parsed.itemType || "api");
          setDecryptedFields(parsed.fields || []);
        } else if (Array.isArray(parsed)) {
          setDecryptedFields(parsed);
        } else {
          setDecryptedFields([{ name: "Secret Value", value: plaintext, type: "secret" }]);
        }
      } catch {
        setDecryptedFields([{ name: "Secret Value", value: plaintext, type: "secret" }]);
      }
      setIsDecrypted(true);
    } catch (err: any) {
      setErrorMsg("Decryption failed. Invalid payload key.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const toggleFieldEye = (idx: number) => {
    setVisibleMasks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <KeyRound size={16} color={theme.colors.primary} />
          <Text style={styles.secretTitle} numberOfLines={1}>
            {secret.secret_name}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => onEdit(secret)}>
            <Pencil size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => onDelete(secret)}>
            <Trash2 size={14} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      {!isDecrypted ? (
        <TouchableOpacity style={styles.decryptButton} onPress={handleDecryptToggle} disabled={isDecrypting}>
          {isDecrypting ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Lock size={14} color={theme.colors.primary} />
              <Text style={styles.decryptBtnText}>Decrypt Payload</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.decryptedContent}>
          <View style={styles.typeBadgeRow}>
            <Text style={styles.typeBadge}>{itemType.toUpperCase()}</Text>
            <TouchableOpacity style={styles.lockBtn} onPress={() => setIsDecrypted(false)}>
              <Unlock size={12} color={theme.colors.success} />
              <Text style={styles.lockBtnText}>Hide</Text>
            </TouchableOpacity>
          </View>

          {decryptedFields.map((field, idx) => {
            const isSecret = field.type === "secret";
            const isVisible = visibleMasks[idx];

            return (
              <View key={idx} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.name}</Text>
                <View style={styles.fieldValueContainer}>
                  <Text style={styles.fieldValueText} numberOfLines={isVisible ? undefined : 1}>
                    {isSecret && !isVisible ? "••••••••••••" : field.value}
                  </Text>
                  {isSecret && (
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => toggleFieldEye(idx)}>
                      {isVisible ? (
                        <EyeOff size={14} color={theme.colors.textMuted} />
                      ) : (
                        <Eye size={14} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  secretTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginVertical: 4,
  },
  decryptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  decryptBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  decryptedContent: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
  },
  typeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.accent,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  lockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  lockBtnText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: "600",
  },
  fieldRow: {
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
  },
  fieldLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldValueText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
    fontFamily: "monospace",
  },
  eyeBtn: {
    paddingLeft: 8,
  },
});
