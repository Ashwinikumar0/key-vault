import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { X, Plus, Trash2 } from "lucide-react-native";
import { Secret, CustomField, SecretItemType, SecretPayload } from "@/domain/types";
import { encryptData, decryptData } from "@/domain/crypto";
import { useAuth } from "@/presentation/context/AuthContext";
import { theme } from "@/presentation/theme";

interface SecretModalProps {
  visible: boolean;
  onClose: () => void;
  workspaceId: string;
  secretToEdit: Secret | null;
  onSave: (secretName: string, encryptedValue: string, iv: string, editId?: string) => Promise<void>;
}

export const SecretModal: React.FC<SecretModalProps> = ({
  visible,
  onClose,
  secretToEdit,
  onSave,
}) => {
  const { encryptionKey } = useAuth();
  const [secretName, setSecretName] = useState<string>("");
  const [itemType, setItemType] = useState<SecretItemType>("login");
  const [fields, setFields] = useState<CustomField[]>([
    { name: "Username", value: "", type: "plaintext" },
    { name: "Password", value: "", type: "secret" },
  ]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (secretToEdit && visible && encryptionKey) {
      setSecretName(secretToEdit.secret_name);
      decryptData(secretToEdit.encrypted_value, secretToEdit.iv, encryptionKey)
        .then((plaintext) => {
          try {
            const parsed = JSON.parse(plaintext) as SecretPayload;
            if (parsed && parsed.fields) {
              setItemType(parsed.itemType || "api");
              setFields(parsed.fields);
            }
          } catch {
            setFields([{ name: "Secret Value", value: plaintext, type: "secret" }]);
          }
        })
        .catch(() => setErrorText("Failed to decrypt secret payload"));
    } else {
      setSecretName("");
      setItemType("login");
      setFields([
        { name: "Username", value: "", type: "plaintext" },
        { name: "Password", value: "", type: "secret" },
      ]);
      setErrorText(null);
    }
  }, [secretToEdit, visible, encryptionKey]);

  const handleAddField = () => {
    setFields([...fields, { name: "", value: "", type: "secret" }]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length === 1) return;
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, key: keyof CustomField, val: string) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: val };
    setFields(updated);
  };

  const handleSubmit = async () => {
    if (!secretName.trim()) {
      setErrorText("Secret title is required.");
      return;
    }

    if (!encryptionKey) {
      setErrorText("Encryption key unavailable. Re-login.");
      return;
    }

    const cleanFields = fields.filter((f) => f.name.trim() !== "" || f.value.trim() !== "");
    if (cleanFields.length === 0) {
      setErrorText("At least one credential field is required.");
      return;
    }

    setIsSaving(true);
    setErrorText(null);

    try {
      const payload: SecretPayload = { itemType, fields: cleanFields };
      const { ciphertext, iv } = await encryptData(JSON.stringify(payload), encryptionKey);
      await onSave(secretName.trim(), ciphertext, iv, secretToEdit?.id);
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "Failed to encrypt secret.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{secretToEdit ? "Edit Secret" : "New Secret Credential"}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {errorText && <Text style={styles.errorBanner}>{errorText}</Text>}

          <ScrollView style={styles.formScroll}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Stripe API Key"
              placeholderTextColor={theme.colors.textMuted}
              value={secretName}
              onChangeText={setSecretName}
            />

            <Text style={styles.label}>Template Type</Text>
            <View style={styles.typeSelectorRow}>
              {(["login", "api", "connection", "certificate", "note"] as SecretItemType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBadge, itemType === t && styles.typeBadgeSelected]}
                  onPress={() => setItemType(t)}
                >
                  <Text style={[styles.typeText, itemType === t && styles.typeTextSelected]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fieldsHeader}>
              <Text style={styles.label}>Credential Fields</Text>
              <TouchableOpacity style={styles.addFieldBtn} onPress={handleAddField}>
                <Plus size={12} color={theme.colors.primary} />
                <Text style={styles.addFieldText}>Add Field</Text>
              </TouchableOpacity>
            </View>

            {fields.map((f, idx) => (
              <View key={idx} style={styles.fieldBuilderRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Field Name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={f.name}
                  onChangeText={(text) => handleUpdateField(idx, "name", text)}
                />
                <TextInput
                  style={[styles.input, { flex: 1.5 }]}
                  placeholder="Value"
                  placeholderTextColor={theme.colors.textMuted}
                  value={f.value}
                  secureTextEntry={f.type === "secret"}
                  onChangeText={(text) => handleUpdateField(idx, "value", text)}
                />
                <TouchableOpacity
                  style={styles.fieldTypeToggle}
                  onPress={() => handleUpdateField(idx, "type", f.type === "secret" ? "plaintext" : "secret")}
                >
                  <Text style={styles.fieldTypeToggleText}>{f.type === "secret" ? "MASK" : "TEXT"}</Text>
                </TouchableOpacity>
                {fields.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveField(idx)}>
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{secretToEdit ? "Save Changes" : "Store Encrypted"}</Text>
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
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: "85%",
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  errorBanner: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
    marginBottom: theme.spacing.sm,
  },
  formScroll: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 8,
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
  },
  typeSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeBadgeSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  typeTextSelected: {
    color: theme.colors.primary,
  },
  fieldsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addFieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  addFieldText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  fieldBuilderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  fieldTypeToggle: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceCard,
  },
  fieldTypeToggleText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
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
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
