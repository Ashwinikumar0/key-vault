import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useSecrets } from "../hooks/useSecrets";
import { Modal } from "../components/Modal";
import { SecretCard } from "../components/SecretCard";
import { PasswordGenerator } from "../components/PasswordGenerator";
import { ImportExportActions } from "../components/ImportExportActions";
import {
  Folder,
  FolderPlus,
  Key,
  Plus,
  LogOut,
  Lock,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";

type SecretItemType = "login" | "connection" | "api" | "certificate" | "note";

interface CustomField {
  name: string;
  value: string;
  type: "secret" | "plaintext";
}

const TEMPLATES: Record<SecretItemType, CustomField[]> = {
  login: [
    { name: "Username", value: "", type: "plaintext" },
    { name: "Password", value: "", type: "secret" },
    { name: "Website URL", value: "", type: "plaintext" }
  ],
  connection: [
    { name: "Connection URI", value: "", type: "secret" },
    { name: "DB Host", value: "", type: "plaintext" },
    { name: "DB Port", value: "", type: "plaintext" },
    { name: "DB Name", value: "", type: "plaintext" },
    { name: "Username", value: "", type: "plaintext" },
    { name: "Password", value: "", type: "secret" }
  ],
  api: [
    { name: "API Key", value: "", type: "secret" },
    { name: "Secret Token", value: "", type: "secret" },
    { name: "Provider/URL", value: "", type: "plaintext" }
  ],
  certificate: [
    { name: "Private Key", value: "", type: "secret" },
    { name: "Public Key", value: "", type: "plaintext" },
    { name: "Passphrase", value: "", type: "secret" }
  ],
  note: [
    { name: "Note", value: "", type: "secret" }
  ]
};

export const DashboardPage: React.FC = () => {
  const { logout, user, encryptionKey } = useAuth();

  // Selected workspace state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Modals state
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);

  // Form states
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newSecretName, setNewSecretName] = useState("");
  const [selectedType, setSelectedType] = useState<SecretItemType>("api");

  // Custom multi-fields creation state
  const [customFields, setCustomFields] = useState<CustomField[]>(TEMPLATES.api);

  // Focus tracking to know where the password generator should inject its text
  const [lastFocusedSecretIndex, setLastFocusedSecretIndex] = useState<number>(0);

  // Field visibility states for toggling eye icon in secret creation modal
  const [visibleFields, setVisibleFields] = useState<Record<number, boolean>>({});

  // JSON Import/Export states
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Custom Hooks (SOLID - Separation of Concerns)
  const {
    workspaces,
    isLoading: workspacesLoading,
    createWorkspace,
    isCreating: workspaceCreating,
    error: workspaceCreateError,
    resetStatus: resetWorkspaceCreateStatus
  } = useWorkspaces();

  const {
    secrets,
    isLoading: secretsLoading,
    createSecret,
    createSecretAsync,
    isCreating: secretCreating,
    error: secretCreateError,
    resetStatus: resetSecretCreateStatus
  } = useSecrets(selectedWorkspaceId);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName) return;
    try {
      const data = await createWorkspace(newWorkspaceName);
      setNewWorkspaceName("");
      setIsWorkspaceModalOpen(false);
      resetWorkspaceCreateStatus();
      setSelectedWorkspaceId(data.id);
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  const handleCreateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretName) return;

    // Ensure all custom fields have name and value
    const cleanFields = customFields.filter((f) => f.name.trim() !== "" && f.value.trim() !== "");
    if (cleanFields.length === 0) return;

    // Serialize custom fields array with itemType to JSON string for local Zero-Knowledge encryption
    const payload = {
      itemType: selectedType,
      fields: cleanFields
    };
    const serializedValue = JSON.stringify(payload);

    createSecret(
      { name: newSecretName, value: serializedValue },
      {
        onSuccess: () => {
          setNewSecretName("");
          // Reset to default templates
          setSelectedType("api");
          setCustomFields(TEMPLATES.api);
          setLastFocusedSecretIndex(0);
          setVisibleFields({});
          setIsSecretModalOpen(false);
          resetSecretCreateStatus();
        },
      }
    );
  };

  const handleCloseWorkspaceModal = () => {
    setIsWorkspaceModalOpen(false);
    resetWorkspaceCreateStatus();
  };

  const handleCloseSecretModal = () => {
    setNewSecretName("");
    setSelectedType("api");
    setCustomFields(TEMPLATES.api);
    setLastFocusedSecretIndex(0);
    setVisibleFields({});
    setIsSecretModalOpen(false);
    resetSecretCreateStatus();
  };

  // Helper row management functions for custom fields
  const handleAddFieldRow = () => {
    setCustomFields([...customFields, { name: "", value: "", type: "secret" }]);
  };

  const handleRemoveFieldRow = (idx: number) => {
    if (customFields.length === 1) return;
    const nextFields = customFields.filter((_, i) => i !== idx);
    setCustomFields(nextFields);

    // Adjust last focused secret index if necessary
    if (lastFocusedSecretIndex >= nextFields.length) {
      setLastFocusedSecretIndex(Math.max(0, nextFields.length - 1));
    }
  };

  const handleUpdateField = (idx: number, key: keyof CustomField, val: string) => {
    const nextFields = customFields.map((field, i) => {
      if (i === idx) {
        return { ...field, [key]: val };
      }
      return field;
    });
    setCustomFields(nextFields);
  };

  const handleGeneratePasswordInModal = (pass: string) => {
    // Inject generated password in the last focused or selected secret field row
    handleUpdateField(lastFocusedSecretIndex, "value", pass);
  };

  const handleTypeTemplateChange = (type: SecretItemType) => {
    setSelectedType(type);
    setCustomFields(TEMPLATES[type]);
    setLastFocusedSecretIndex(0);
  };

  const activeWorkspace = workspaces?.find((w) => w.id === selectedWorkspaceId);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <Lock size={20} style={{ color: "var(--primary)" }} />
            <span>KeyVault</span>
          </div>
        </div>

        <div className="sidebar-scroll">
          {/* Workspaces Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>Workspaces</span>
              <button className="icon-btn" onClick={() => setIsWorkspaceModalOpen(true)} title="Create new workspace" data-testid="create-workspace-trigger">
                <Plus size={16} />
              </button>
            </div>

            {workspacesLoading ? (
              <div style={{ padding: "0 8px", fontSize: "13px", color: "var(--text-muted)" }}>Loading...</div>
            ) : !workspaces || workspaces.length === 0 ? (
              <div style={{ padding: "0 8px", fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                No workspaces created yet.
              </div>
            ) : (
              workspaces.map((w) => (
                <button
                  key={w.id}
                  className={`sidebar-item ${selectedWorkspaceId === w.id ? "active" : ""}`}
                  onClick={() => setSelectedWorkspaceId(w.id)}
                  data-testid="workspace-item"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <Folder size={16} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{w.workspace_name}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{user?.email[0].toUpperCase() || "U"}</div>
            <div className="user-details">
              <span className="user-email" title={user?.email}>
                {user?.email}
              </span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-block" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        {selectedWorkspaceId && activeWorkspace ? (
          <>
            <header className="topbar">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Folder size={24} style={{ color: "var(--primary)" }} />
                <h1 className="page-title">{activeWorkspace.workspace_name}</h1>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <ImportExportActions
                  secrets={secrets}
                  activeWorkspaceName={activeWorkspace.workspace_name}
                  encryptionKey={encryptionKey}
                  createSecretAsync={createSecretAsync}
                  onImportStart={() => {
                    setIsImporting(true);
                    setImportError(null);
                  }}
                  onImportEnd={(err) => {
                    setIsImporting(false);
                    if (err) setImportError(err);
                  }}
                  disabled={isImporting}
                />
                <button className="btn btn-primary" onClick={() => setIsSecretModalOpen(true)} disabled={isImporting} data-testid="add-secret-trigger">
                  <Plus size={16} /> Add Secret
                </button>
              </div>
            </header>

            <section className="content-body">
              {importError && (
                <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
                  <span>{importError}</span>
                </div>
              )}

              {isImporting && (
                <div className="alert alert-info" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lock size={16} />
                  <span>Importing and encrypting credentials locally... Please do not close this window.</span>
                </div>
              )}
              {secretsLoading ? (
                <div className="empty-state">Loading workspace keys...</div>
              ) : !secrets || secrets.length === 0 ? (
                <div className="empty-state glass-panel animate-fade-in">
                  <div className="empty-icon">
                    <Key size={32} />
                  </div>
                  <h3 className="empty-title">Workspace is Empty</h3>
                  <p className="empty-desc">
                    There are no credentials stored in this workspace yet. Keep credentials safe by adding them.
                  </p>
                  <button className="btn btn-primary" onClick={() => setIsSecretModalOpen(true)}>
                    <Plus size={16} /> Add Secret
                  </button>
                </div>
              ) : (
                <div className="card-grid">
                  {encryptionKey &&
                    secrets.map((s) => (
                      <SecretCard key={s.id} secret={s} encryptionKey={encryptionKey} />
                    ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
            <div className="empty-state animate-fade-in" style={{ padding: "40px" }}>
              <div className="empty-icon" style={{ width: "80px", height: "80px" }}>
                <Lock size={40} style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="empty-title" style={{ fontSize: "22px" }}>Welcome to KeyVault</h3>
              <p className="empty-desc">
                Select an existing project workspace from the sidebar folder directory, or create a new one to store client-encrypted keys.
              </p>
              <button className="btn btn-primary" onClick={() => setIsWorkspaceModalOpen(true)} data-testid="create-workspace-trigger-empty">
                <FolderPlus size={16} /> Create Workspace Folder
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={isWorkspaceModalOpen}
        onClose={handleCloseWorkspaceModal}
        title="New Workspace"
      >
        {workspaceCreateError && (
          <div className="alert alert-danger">
            <span>{workspaceCreateError.message}</span>
          </div>
        )}

        <form onSubmit={handleCreateWorkspace}>
          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label className="form-label" htmlFor="workspace-name">
              Workspace Folder Name
            </label>
            <input
              id="workspace-name"
              type="text"
              className="form-input"
              placeholder="e.g. My Website API Keys"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              required
              disabled={workspaceCreating}
              autoFocus
              data-testid="workspace-name-input"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseWorkspaceModal}
              disabled={workspaceCreating}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={workspaceCreating} data-testid="workspace-name-submit">
              {workspaceCreating ? "Creating Folder..." : "Create Folder"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Secret Modal (Uses reusable Modal + Templates Selector) */}
      <Modal
        isOpen={isSecretModalOpen}
        onClose={handleCloseSecretModal}
        title="Store Secure Secret"
        maxWidth="620px"
      >
        {secretCreateError && (
          <div className="alert alert-danger">
            <span>{secretCreateError.message}</span>
          </div>
        )}

        <form onSubmit={handleCreateSecret}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 2 }}>
              <label className="form-label" htmlFor="secret-name">
                Item Description / Title
              </label>
              <input
                id="secret-name"
                type="text"
                className="form-input"
                placeholder="e.g., AWS IAM User Accounts"
                value={newSecretName}
                onChange={(e) => setNewSecretName(e.target.value)}
                required
                disabled={secretCreating}
                autoFocus
                data-testid="secret-name-input"
              />
            </div>

            <div style={{ flex: 1 }}>
              <label className="form-label" htmlFor="item-type">
                Item Template
              </label>
              <select
                id="item-type"
                className="form-input"
                value={selectedType}
                onChange={(e) => handleTypeTemplateChange(e.target.value as SecretItemType)}
                disabled={secretCreating}
                data-testid="item-type-select"
              >
                <option value="api">API Key</option>
                <option value="login">Login Login</option>
                <option value="connection">Connection String</option>
                <option value="certificate">SSH / PEM Certificate</option>
                <option value="note">Secure Note</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label">Credentials & Fields</label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddFieldRow}
                style={{ padding: "4px 10px", fontSize: "11px", gap: "4px" }}
                disabled={secretCreating}
                data-testid="field-add-button"
              >
                <Plus size={12} /> Add Field
              </button>
            </div>

            {/* Custom fields list builder */}
            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                paddingRight: "4px",
              }}
            >
              {customFields.map((field, idx) => {
                const isKeyOrNote =
                  field.name === "Private Key" ||
                  field.name === "Public Key" ||
                  field.name === "Note" ||
                  selectedType === "note";

                return (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: isKeyOrNote ? "flex-start" : "center" }}>
                    <div style={{ flex: 1.5 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Field Name"
                        value={field.name}
                        onChange={(e) => handleUpdateField(idx, "name", e.target.value)}
                        required
                        disabled={secretCreating}
                        style={{ padding: "8px 12px", fontSize: "13px" }}
                        data-testid="field-name-input"
                      />
                    </div>

                    <div style={{ flex: 1.2 }}>
                      <select
                        className="form-input"
                        value={field.type}
                        onChange={(e) => handleUpdateField(idx, "type", e.target.value as "secret" | "plaintext")}
                        disabled={secretCreating}
                        style={{ padding: "8px 12px", fontSize: "13px" }}
                        data-testid="field-type-select"
                      >
                        <option value="secret">Secret</option>
                        <option value="plaintext">Plain text</option>
                      </select>
                    </div>

                    <div style={{ flex: 2 }}>
                      {isKeyOrNote ? (
                        <textarea
                          className="form-input"
                          placeholder="Value"
                          rows={4}
                          value={field.value}
                          onChange={(e) => handleUpdateField(idx, "value", e.target.value)}
                          onFocus={() => {
                            if (field.type === "secret") setLastFocusedSecretIndex(idx);
                          }}
                          required
                          disabled={secretCreating}
                          style={{ padding: "8px 12px", fontSize: "13px", resize: "vertical", fontFamily: "monospace" }}
                          data-testid="field-value-input"
                        />
                      ) : (
                        <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
                          <input
                            type={field.type === "secret" && !visibleFields[idx] ? "password" : "text"}
                            className="form-input"
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleUpdateField(idx, "value", e.target.value)}
                            onFocus={() => {
                              if (field.type === "secret") setLastFocusedSecretIndex(idx);
                            }}
                            required
                            disabled={secretCreating}
                            style={{ padding: "8px 36px 8px 12px", fontSize: "13px", width: "100%" }}
                            data-testid="field-value-input"
                          />
                          {field.type === "secret" && (
                            <button
                              type="button"
                              onClick={() => setVisibleFields((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                              style={{
                                position: "absolute",
                                right: "8px",
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                padding: 0
                              }}
                              title={visibleFields[idx] ? "Hide value" : "Show value"}
                              data-testid="field-eye-toggle"
                            >
                              {visibleFields[idx] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {customFields.length > 1 && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveFieldRow(idx)}
                        disabled={secretCreating}
                        style={{ color: "var(--danger)", marginTop: isKeyOrNote ? "8px" : 0 }}
                        title="Delete field"
                        data-testid="field-remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Password Generator */}
          <div style={{ marginBottom: "24px" }}>
            <PasswordGenerator onGenerate={handleGeneratePasswordInModal} />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseSecretModal}
              disabled={secretCreating}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={secretCreating} data-testid="secret-submit">
              {secretCreating ? "Encrypting & Storing..." : "Store Encrypted Item"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
