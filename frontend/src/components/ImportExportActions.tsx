import React from "react";
import { Download, Upload } from "lucide-react";
import { decryptData } from "../utils/cryptoUtils";
import type { SecretResponse } from "../utils/api";

interface ImportExportActionsProps {
  secrets?: SecretResponse[];
  activeWorkspaceName?: string;
  encryptionKey: CryptoKey | null;
  createSecretAsync: (payload: { name: string; value: string }) => Promise<any>;
  onImportStart: () => void;
  onImportEnd: (error?: string | null) => void;
  disabled?: boolean;
}

export const ImportExportActions: React.FC<ImportExportActionsProps> = ({
  secrets,
  activeWorkspaceName,
  encryptionKey,
  createSecretAsync,
  onImportStart,
  onImportEnd,
  disabled
}) => {
  const handleDownloadSampleJson = () => {
    const template = [
      {
        name: "Example Login Credential",
        itemType: "login",
        fields: [
          { name: "Username", value: "admin", type: "plaintext" },
          { name: "Password", value: "change_me_immediately", type: "secret" },
          { name: "Website URL", value: "https://example.local", type: "plaintext" }
        ]
      },
      {
        name: "Example API Connection",
        itemType: "api",
        fields: [
          { name: "API Key", value: "ak_test_51Mz2H7Lz8", type: "secret" },
          { name: "Provider/URL", value: "https://api.stripe.com", type: "plaintext" }
        ]
      }
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyvault_import_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSecrets = async () => {
    if (!encryptionKey || !secrets || secrets.length === 0) return;
    try {
      const exportedData = [];
      for (const sec of secrets) {
        const plaintext = await decryptData(sec.encrypted_value, sec.iv, encryptionKey);
        let itemType: string = "api";
        let fields: any[] = [];
        try {
          const parsed = JSON.parse(plaintext);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "itemType" in parsed) {
            itemType = parsed.itemType;
            fields = parsed.fields;
          } else if (Array.isArray(parsed)) {
            fields = parsed;
          } else {
            fields = [{ name: "Secret Value", value: plaintext, type: "secret" }];
          }
        } catch {
          fields = [{ name: "Secret Value", value: plaintext, type: "secret" }];
        }
        exportedData.push({
          name: sec.secret_name,
          itemType,
          fields
        });
      }

      const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const wsNameClean = activeWorkspaceName ? activeWorkspaceName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "workspace";
      a.download = `keyvault_export_${wsNameClean}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: Decryption error. Re-authenticate or verify your encryption key.");
    }
  };

  const handleImportSecrets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be imported again
    e.target.value = "";

    onImportStart();

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          throw new Error("Invalid format: Root JSON must be an array of secrets.");
        }

        // Validate structure
        for (const item of parsed) {
          if (!item.name || typeof item.name !== "string" || item.name.trim() === "") {
            throw new Error("Invalid format: Each item must have a non-empty 'name'.");
          }
          if (!Array.isArray(item.fields)) {
            throw new Error(`Invalid format for '${item.name}': 'fields' must be an array.`);
          }
          for (const f of item.fields) {
            if (!f.name || typeof f.name !== "string" || f.name.trim() === "") {
              throw new Error(`Invalid format in '${item.name}': Each field must have a non-empty 'name'.`);
            }
            if (f.value === undefined || typeof f.value !== "string") {
              throw new Error(`Invalid format in '${item.name}': Field '${f.name}' must have a string 'value'.`);
            }
            if (f.type !== "secret" && f.type !== "plaintext") {
              throw new Error(`Invalid format in '${item.name}': Field '${f.name}' type must be 'secret' or 'plaintext'.`);
            }
          }
        }

        // Now import one by one
        let importedCount = 0;
        for (const item of parsed) {
          const payload = {
            itemType: item.itemType || "api",
            fields: item.fields
          };
          const serializedValue = JSON.stringify(payload);
          await createSecretAsync({ name: item.name, value: serializedValue });
          importedCount++;
        }

        onImportEnd(null);
        alert(`Successfully imported ${importedCount} secrets into the workspace!`);
      } catch (err: any) {
        console.error("Import failed:", err);
        onImportEnd(err.message || "Unknown error occurred during import.");
        alert(`Import failed: ${err.message || "Unknown error occurred."}`);
      }
    };
    reader.onerror = () => {
      onImportEnd("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleDownloadSampleJson}
        disabled={disabled}
        title="Download template import format JSON"
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", fontSize: "13px" }}
        data-testid="download-template-button"
      >
        <Download size={14} /> Download Template
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleExportSecrets}
        disabled={disabled || !secrets || secrets.length === 0}
        title="Decrypt and export all secrets inside this workspace"
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", fontSize: "13px" }}
        data-testid="export-json-button"
      >
        <Download size={14} /> Export JSON
      </button>
      <label
        className={`btn btn-secondary ${disabled ? "disabled" : ""}`}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          fontSize: "13px",
          opacity: disabled ? 0.6 : 1
        }}
        title="Import secrets from JSON file"
      >
        <Upload size={14} /> Import JSON
        <input
          type="file"
          accept=".json"
          onChange={handleImportSecrets}
          style={{ display: "none" }}
          disabled={disabled}
          data-testid="import-json-input"
        />
      </label>
    </div>
  );
};
