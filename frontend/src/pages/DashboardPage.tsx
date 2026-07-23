import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useSecrets } from "../hooks/useSecrets";
import { Modal } from "../components/Modal";
import { SecretCard } from "../components/SecretCard";
import { PasswordGenerator } from "../components/PasswordGenerator";
import { ImportExportActions } from "../components/ImportExportActions";
import { decryptData } from "../utils/cryptoUtils";
import type { SecretResponse, WorkspaceResponse } from "../utils/api";
import { UserRole } from "../utils/api";
import { useNavigate } from "@tanstack/react-router";
import {
  Folder,
  FolderPlus,
  Key,
  Plus,
  LogOut,
  Lock,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Pencil
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
  const navigate = useNavigate();
  const { user, logout, encryptionKey } = useAuth();

  // Selected workspace state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Modals state
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  
  // Create Secret Form State
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState("");
  const [selectedType, setSelectedType] = useState<SecretItemType>("api");
  const [customFields, setCustomFields] = useState<CustomField[]>(TEMPLATES.api);

  // Edit Secret Form State
  const [editingSecret, setEditingSecret] = useState<SecretResponse | null>(null);
  const [isEditSecretModalOpen, setIsEditSecretModalOpen] = useState(false);
  const [editSecretName, setEditSecretName] = useState("");
  const [editSelectedType, setEditSelectedType] = useState<SecretItemType>("api");
  const [editCustomFields, setEditCustomFields] = useState<CustomField[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDecryptingEdit, setIsDecryptingEdit] = useState(false);

  // Rename Workspace Form State
  const [renamingWorkspace, setRenamingWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isRenameWorkspaceModalOpen, setIsRenameWorkspaceModalOpen] = useState(false);
  const [renameWorkspaceName, setRenameWorkspaceName] = useState("");
  const [renameWorkspaceError, setRenameWorkspaceError] = useState<string | null>(null);

  // Delete Workspace Modal State
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceResponse | null>(null);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [deleteWorkspaceModalError, setDeleteWorkspaceModalError] = useState<string | null>(null);

  // Delete Account State
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
    updateWorkspace,
    deleteWorkspace,
    isCreating: workspaceCreating,
    error: workspaceCreateError,
    resetStatus: resetWorkspaceCreateStatus
  } = useWorkspaces();

  // Auto-select the first workspace by default if none is selected
  React.useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const exists = workspaces.some((w) => w.id === selectedWorkspaceId);
      if (!selectedWorkspaceId || !exists) {
        setSelectedWorkspaceId(workspaces[0].id);
      }
    }
  }, [workspaces, selectedWorkspaceId]);

  const {
    secrets,
    isLoading: secretsLoading,
    createSecret,
    createSecretAsync,
    updateSecretAsync,
    deleteSecretAsync,
    isCreating: secretCreating,
    error: secretCreateError,
    resetStatus: resetSecretCreateStatus
  } = useSecrets(selectedWorkspaceId);

  const handleDeleteSecret = async (secretId: string) => {
    try {
      await deleteSecretAsync(secretId);
    } catch (err: any) {
      alert(`Failed to delete secret: ${err.message || "Unknown error"}`);
    }
  };

  const handleOpenEditModal = async (sec: SecretResponse) => {
    if (!encryptionKey) {
      alert("Security keys missing from memory. Please log in again.");
      return;
    }
    setEditingSecret(sec);
    setEditSecretName(sec.secret_name);
    setEditError(null);
    setIsDecryptingEdit(true);
    setIsEditSecretModalOpen(true);

    try {
      const plaintext = await decryptData(sec.encrypted_value, sec.iv, encryptionKey);
      let type: SecretItemType = "api";
      let fieldsList: CustomField[] = [];

      try {
        const parsed = JSON.parse(plaintext);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "itemType" in parsed) {
          type = parsed.itemType;
          fieldsList = parsed.fields;
        } else if (Array.isArray(parsed)) {
          fieldsList = parsed as CustomField[];
        } else {
          fieldsList = [{ name: "Secret Value", value: plaintext, type: "secret" }];
        }
      } catch {
        fieldsList = [{ name: "Secret Value", value: plaintext, type: "secret" }];
      }

      setEditSelectedType(type);
      setEditCustomFields(fieldsList);
    } catch (err: any) {
      setEditError("Failed to decrypt secret payload for editing.");
    } finally {
      setIsDecryptingEdit(false);
    }
  };

  const handleCloseEditSecretModal = () => {
    setIsEditSecretModalOpen(false);
    setEditingSecret(null);
    setEditSecretName("");
    setEditCustomFields([]);
    setEditError(null);
  };

  const handleSaveEditedSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSecret || !editSecretName.trim()) return;

    const cleanFields = editCustomFields.filter(f => f.name.trim() !== "" || f.value.trim() !== "");
    if (cleanFields.length === 0) return;

    const payload = {
      itemType: editSelectedType,
      fields: cleanFields
    };
    const serializedValue = JSON.stringify(payload);

    try {
      await updateSecretAsync({ id: editingSecret.id, name: editSecretName, value: serializedValue });
      handleCloseEditSecretModal();
    } catch (err: any) {
      setEditError(err.message || "Failed to update secret");
    }
  };

  const handleAddEditFieldRow = () => {
    setEditCustomFields([...editCustomFields, { name: "", value: "", type: "secret" }]);
  };

  const handleRemoveEditFieldRow = (idx: number) => {
    if (editCustomFields.length === 1) return;
    setEditCustomFields(editCustomFields.filter((_, i) => i !== idx));
  };

  const handleUpdateEditField = (idx: number, key: keyof CustomField, val: string) => {
    const nextFields = editCustomFields.map((field, i) => {
      if (i === idx) {
        return { ...field, [key]: val };
      }
      return field;
    });
    setEditCustomFields(nextFields);
  };

  const handleOpenRenameWorkspace = (ws: WorkspaceResponse) => {
    setRenamingWorkspace(ws);
    setRenameWorkspaceName(ws.workspace_name);
    setRenameWorkspaceError(null);
    setIsRenameWorkspaceModalOpen(true);
  };

  const handleSaveRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingWorkspace || !renameWorkspaceName.trim()) return;
    try {
      await updateWorkspace({ id: renamingWorkspace.id, name: renameWorkspaceName });
      setIsRenameWorkspaceModalOpen(false);
      setRenamingWorkspace(null);
    } catch (err: any) {
      setRenameWorkspaceError(err.message || "Failed to rename workspace");
    }
  };

  const handleOpenDeleteWorkspace = (ws: WorkspaceResponse) => {
    setWorkspaceToDelete(ws);
    setDeleteWorkspaceModalError(null);
    setIsDeleteWorkspaceModalOpen(true);
  };

  const handleConfirmDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    setIsDeletingWorkspace(true);
    setDeleteWorkspaceModalError(null);

    try {
      await deleteWorkspace(workspaceToDelete.id);
      if (selectedWorkspaceId === workspaceToDelete.id) {
        setSelectedWorkspaceId(null);
      }
      setIsDeleteWorkspaceModalOpen(false);
      setWorkspaceToDelete(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to delete workspace";
      setDeleteWorkspaceModalError(msg);
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { api: apiServices } = await import("../utils/api");
      await apiServices.user.deleteAccount();
      await logout();
    } catch (err: any) {
      alert(`Failed to delete account: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeletingAccount(false);
    }
  };

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
          {user?.role === UserRole.ADMIN && (
            <div className="sidebar-section" style={{ marginBottom: "16px" }}>
              <div className="sidebar-section-title">Administration</div>
              <button
                className="sidebar-item"
                onClick={() => navigate({ to: "/admin" })}
                data-testid="admin-panel-link"
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={16} style={{ color: "var(--primary)" }} />
                  <span>Admin Dashboard</span>
                </span>
              </button>
            </div>
          )}

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
                <div key={w.id} style={{ display: "flex", alignItems: "center", width: "100%", gap: "4px" }}>
                  <button
                    className={`sidebar-item ${selectedWorkspaceId === w.id ? "active" : ""}`}
                    onClick={() => setSelectedWorkspaceId(w.id)}
                    style={{ flex: 1 }}
                    data-testid="workspace-item"
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Folder size={16} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{w.workspace_name}</span>
                    </span>
                  </button>
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRenameWorkspace(w);
                    }}
                    title="Rename workspace"
                    data-testid="rename-workspace-trigger"
                    style={{ padding: "4px" }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteWorkspace(w);
                    }}
                    title="Delete workspace"
                    data-testid="delete-workspace-trigger"
                    style={{ color: "var(--danger)", padding: "4px" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button className="btn btn-secondary btn-block" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
            {user?.role !== UserRole.ADMIN && (
              <button
                className="btn btn-block"
                onClick={() => setIsDeleteAccountModalOpen(true)}
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
              >
                <Trash2 size={14} /> Delete My Data & Account
              </button>
            )}
          </div>
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
                <button
                  className="icon-btn"
                  onClick={() => handleOpenRenameWorkspace(activeWorkspace)}
                  title="Rename workspace"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => handleOpenDeleteWorkspace(activeWorkspace)}
                  title="Delete workspace"
                  style={{ color: "var(--danger)" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {user?.role === UserRole.ADMIN && (
                  <button className="btn btn-secondary" onClick={() => navigate({ to: "/admin" })} data-testid="admin-panel-topbar-link">
                    <Shield size={16} /> Admin Panel
                  </button>
                )}
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
                      <SecretCard key={s.id} secret={s} encryptionKey={encryptionKey} onEdit={handleOpenEditModal} onDelete={handleDeleteSecret} />
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

      {/* Edit Secret Modal */}
      <Modal
        isOpen={isEditSecretModalOpen}
        onClose={handleCloseEditSecretModal}
        title="Edit Secure Secret"
      >
        {editError && (
          <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
            <span>{editError}</span>
          </div>
        )}

        {isDecryptingEdit ? (
          <div className="empty-state" style={{ padding: "30px 0" }}>Decrypting secret for editing...</div>
        ) : (
          <form onSubmit={handleSaveEditedSecret}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label" htmlFor="edit-secret-name">
                Item Description / Title
              </label>
              <input
                id="edit-secret-name"
                type="text"
                className="form-input"
                placeholder="e.g. AWS Production Credentials"
                value={editSecretName}
                onChange={(e) => setEditSecretName(e.target.value)}
                required
                data-testid="edit-secret-name-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" htmlFor="edit-secret-type">
                Item Template
              </label>
              <select
                id="edit-secret-type"
                className="form-input"
                value={editSelectedType}
                onChange={(e) => setEditSelectedType(e.target.value as SecretItemType)}
              >
                <option value="login">Login (Username & Password)</option>
                <option value="connection">Connection (Host, Port, DB)</option>
                <option value="api">API Key & Token</option>
                <option value="certificate">SSL / RSA Key</option>
                <option value="note">Secure Note</option>
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Credentials & Fields
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddEditFieldRow}
                  style={{ padding: "4px 8px", fontSize: "11px", gap: "4px" }}
                >
                  <Plus size={12} /> Add Field
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {editCustomFields.map((field, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 2fr auto", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: "12px", padding: "6px 10px" }}
                      placeholder="Field Label"
                      value={field.name}
                      onChange={(e) => handleUpdateEditField(idx, "name", e.target.value)}
                      required
                    />
                    <select
                      className="form-input"
                      style={{ fontSize: "12px", padding: "6px 8px" }}
                      value={field.type}
                      onChange={(e) => handleUpdateEditField(idx, "type", e.target.value as "secret" | "plaintext")}
                    >
                      <option value="plaintext">Plain text</option>
                      <option value="secret">Secret</option>
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: "12px", padding: "6px 10px" }}
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) => handleUpdateEditField(idx, "value", e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleRemoveEditFieldRow(idx)}
                      disabled={editCustomFields.length === 1}
                      title="Remove field"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseEditSecretModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" data-testid="save-edited-secret-button">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Rename Workspace Modal */}
      <Modal
        isOpen={isRenameWorkspaceModalOpen}
        onClose={() => setIsRenameWorkspaceModalOpen(false)}
        title="Rename Workspace"
      >
        {renameWorkspaceError && (
          <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
            <span>{renameWorkspaceError}</span>
          </div>
        )}

        <form onSubmit={handleSaveRenameWorkspace}>
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label className="form-label" htmlFor="rename-workspace-name">
              Workspace Name
            </label>
            <input
              id="rename-workspace-name"
              type="text"
              className="form-input"
              value={renameWorkspaceName}
              onChange={(e) => setRenameWorkspaceName(e.target.value)}
              placeholder="e.g. Production Vault"
              required
              autoFocus
              data-testid="rename-workspace-name-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsRenameWorkspaceModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" data-testid="rename-workspace-submit">
              Save Workspace Name
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Workspace Modal */}
      <Modal
        isOpen={isDeleteWorkspaceModalOpen}
        onClose={() => {
          setIsDeleteWorkspaceModalOpen(false);
          setWorkspaceToDelete(null);
          setDeleteWorkspaceModalError(null);
        }}
        title="Delete Workspace"
      >
        {workspaceToDelete && (
          <div>
            {deleteWorkspaceModalError && (
              <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
                <span>{deleteWorkspaceModalError}</span>
              </div>
            )}

            {selectedWorkspaceId === workspaceToDelete.id && secrets && secrets.length > 0 ? (
              <div>
                <div
                  className="alert alert-danger"
                  style={{ marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-start" }}
                >
                  <Trash2 size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Cannot Delete Workspace</strong>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
                      Workspace <strong>"{workspaceToDelete.workspace_name}"</strong> contains{" "}
                      <strong>{secrets.length} active credential(s)</strong>.
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
                      Please delete or move all credentials inside this workspace before deleting it.
                    </p>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsDeleteWorkspaceModalOpen(false);
                      setWorkspaceToDelete(null);
                    }}
                  >
                    Got It
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: "20px", fontSize: "14px", color: "var(--text-muted)" }}>
                  Are you sure you want to delete workspace <strong>"{workspaceToDelete.workspace_name}"</strong>? This action cannot be undone.
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsDeleteWorkspaceModalOpen(false);
                      setWorkspaceToDelete(null);
                    }}
                    disabled={isDeletingWorkspace}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleConfirmDeleteWorkspace}
                    disabled={isDeletingWorkspace}
                    style={{ background: "var(--danger)", color: "#fff" }}
                    data-testid="confirm-delete-workspace"
                  >
                    {isDeletingWorkspace ? "Deleting..." : "Delete Workspace"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        title="Delete Account & All Data"
      >
        <div className="alert alert-danger" style={{ marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <Trash2 size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Warning: Permanent Action</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
              This will permanently delete your account profile, all workspaces, and all encrypted credentials. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteAccountModalOpen(false)} disabled={isDeletingAccount}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {isDeletingAccount ? "Deleting All Data..." : "Permanently Delete My Data"}
          </button>
        </div>
      </Modal>
    </div>
  );
};
