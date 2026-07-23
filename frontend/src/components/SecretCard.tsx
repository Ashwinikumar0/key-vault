import React, { useState } from "react";
import { decryptData } from "../utils/cryptoUtils";
import type { SecretResponse } from "../utils/api";
import { Modal } from "./Modal";
import {
  Key,
  Lock,
  Unlock,
  Clock,
  EyeOff,
  Eye,
  Check,
  Copy,
  User,
  Database,
  FileCheck,
  StickyNote,
  Trash2,
  Pencil
} from "lucide-react";

interface CustomField {
  name: string;
  value: string;
  type: "secret" | "plaintext";
}

type SecretItemType = "login" | "connection" | "api" | "certificate" | "note";

interface SecretCardProps {
  secret: SecretResponse;
  encryptionKey: CryptoKey;
  onEdit?: (secret: SecretResponse) => void;
  onDelete?: (secretId: string) => void;
}

export const SecretCard: React.FC<SecretCardProps> = ({ secret, encryptionKey, onEdit, onDelete }) => {
  const [decryptedFields, setDecryptedFields] = useState<CustomField[] | null>(null);
  const [itemTypeState, setItemTypeState] = useState<SecretItemType>("api");
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<number>>(new Set());
  const [copiedFieldIdx, setCopiedFieldIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecryptCard = async () => {
    if (isDecrypted) {
      // Lock card again and immediately clear credentials from memory
      setDecryptedFields(null);
      setRevealedFields(new Set());
      setIsDecrypted(false);
      return;
    }

    try {
      setError(null);
      setIsDecrypting(true);

      const plaintext = await decryptData(secret.encrypted_value, secret.iv, encryptionKey);

      let type: SecretItemType = "api";
      let fieldsList: CustomField[] = [];

      // Attempt to parse as JSON
      try {
        const parsed = JSON.parse(plaintext);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "itemType" in parsed) {
          // New format { itemType, fields }
          type = parsed.itemType;
          fieldsList = parsed.fields;
        } else if (Array.isArray(parsed)) {
          // Legacy custom fields array format
          fieldsList = parsed as CustomField[];
        } else {
          fieldsList = [{ name: "Secret Value", value: plaintext, type: "secret" }];
        }
      } catch {
        // Legacy plain string format
        fieldsList = [{ name: "Secret Value", value: plaintext, type: "secret" }];
      }

      setDecryptedFields(fieldsList);
      setItemTypeState(type);
      setIsDecrypted(true);
    } catch (err) {
      console.error("Failed to decrypt secret card:", err);
      setError("Decryption failed. Please check key authorization.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleToggleFieldReveal = (idx: number) => {
    const nextRevealed = new Set(revealedFields);
    if (nextRevealed.has(idx)) {
      nextRevealed.delete(idx);
    } else {
      nextRevealed.add(idx);
    }
    setRevealedFields(nextRevealed);
  };

  const handleCopyFieldVal = async (idx: number, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedFieldIdx(idx);
      setTimeout(() => setCopiedFieldIdx(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getItemIcon = () => {
    switch (itemTypeState) {
      case "login":
        return <User size={16} style={{ color: "var(--primary)" }} />;
      case "connection":
        return <Database size={16} style={{ color: "var(--accent)" }} />;
      case "api":
        return <Key size={16} style={{ color: "var(--accent)" }} />;
      case "certificate":
        return <FileCheck size={16} style={{ color: "#34d399" }} />;
      case "note":
        return <StickyNote size={16} style={{ color: "#fbbf24" }} />;
      default:
        return <Key size={16} style={{ color: "var(--accent)" }} />;
    }
  };

  return (
    <div className="card glass-panel secret-card animate-fade-in" style={{ padding: "24px" }} data-testid="secret-card">
      <div className="card-header" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {getItemIcon()}
          <h3 className="card-title" style={{ fontSize: "16px", fontWeight: 700 }}>
            {secret.secret_name}
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {isDecrypted && (
            <button className="icon-btn" onClick={handleDecryptCard} title="Lock credentials from memory">
              <Lock size={16} style={{ color: "var(--success)" }} />
            </button>
          )}
          {onEdit && (
            <button
              className="icon-btn"
              onClick={() => onEdit(secret)}
              title="Edit Secret"
              data-testid="edit-secret-button"
            >
              <Pencil size={16} />
            </button>
          )}
          {onDelete && (
            <>
              <button
                className="icon-btn"
                onClick={() => setIsDeleteConfirmOpen(true)}
                title="Delete Secret"
                data-testid="delete-secret-button"
                style={{ color: "#ef4444" }}
              >
                <Trash2 size={16} />
              </button>

              <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="Delete Secret"
              >
                <p style={{ marginBottom: "20px", fontSize: "14px", color: "var(--text-muted)" }}>
                  Are you sure you want to delete credential <strong>"{secret.secret_name}"</strong>? This action cannot be undone.
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      onDelete(secret.id);
                    }}
                    style={{ background: "var(--danger)", color: "#fff" }}
                    data-testid="confirm-delete-secret"
                  >
                    Delete Secret
                  </button>
                </div>
              </Modal>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ padding: "8px 12px", fontSize: "12px", marginBottom: "12px" }}>
          <span>{error}</span>
        </div>
      )}

      {!isDecrypted ? (
        // Locked State Layout
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", padding: "12px 0" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>
            Contains client-encrypted credentials
          </span>
          <button
            className="btn btn-secondary btn-block"
            onClick={handleDecryptCard}
            disabled={isDecrypting}
            style={{ fontSize: "13px", padding: "8px 16px", gap: "6px" }}
            data-testid="decrypt-card-button"
          >
            {isDecrypting ? (
              "Decrypting..."
            ) : (
              <>
                <Unlock size={14} /> Decrypt Credentials
              </>
            )}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)" }}>
            <Clock size={10} />
            <span>Added {new Date(secret.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ) : (
        // Decrypted / Unlocked State Layout
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {decryptedFields &&
            decryptedFields.map((field, idx) => {
              const isSecret = field.type === "secret";
              const isRevealed = revealedFields.has(idx);
              const isMultiLine = field.value.includes("\n");

              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    className="form-label"
                    style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}
                  >
                    {field.name}
                  </span>

                  <div 
                    className="secret-val-container" 
                    style={{ 
                      marginTop: 0, 
                      padding: "8px 12px", 
                      alignItems: isMultiLine ? "flex-start" : "center" 
                    }}
                  >
                    {isSecret && !isRevealed ? (
                      <span className="secret-value" style={{ fontSize: "13px" }} data-testid="secret-field-value-masked">
                        ••••••••••••••••
                      </span>
                    ) : isMultiLine ? (
                      <pre
                        style={{
                          margin: 0,
                          padding: "10px",
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          maxHeight: "120px",
                          overflowY: "auto",
                          color: "#e2e8f0",
                          flex: 1
                        }}
                        data-testid="secret-field-value"
                      >
                        {field.value}
                      </pre>
                    ) : (
                      <span className="secret-value" style={{ fontSize: "13px" }} data-testid="secret-field-value">
                        {field.value}
                      </span>
                    )}

                    <div 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "4px", 
                        marginTop: isMultiLine && (!isSecret || isRevealed) ? "6px" : 0 
                      }}
                    >
                      {isSecret && (
                        <button
                          className="icon-btn"
                          onClick={() => handleToggleFieldReveal(idx)}
                          title={isRevealed ? "Hide field value" : "Show field value"}
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        onClick={() => handleCopyFieldVal(idx, field.value)}
                        title="Copy value"
                      >
                        {copiedFieldIdx === idx ? (
                          <Check size={14} style={{ color: "var(--success)" }} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border)",
              paddingTop: "12px",
              marginTop: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)" }}>
              <Clock size={10} />
              <span>Added {new Date(secret.created_at).toLocaleDateString()}</span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleDecryptCard}
              style={{ padding: "4px 10px", fontSize: "11px", gap: "4px" }}
            >
              <Lock size={12} /> Lock
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
