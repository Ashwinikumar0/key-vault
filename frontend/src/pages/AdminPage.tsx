import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../hooks/useAdmin";
import { Modal } from "../components/Modal";
import { MetricCard } from "../components/MetricCard";
import { Table } from "../components/Table";
import { UserRole } from "../utils/api";
import type { UserResponse } from "../utils/api";
import {
  Users,
  UserPlus,
  BarChart3,
  LogOut,
  Copy,
  Check,
  ShieldCheck,
  Lock
} from "lucide-react";

export const AdminPage: React.FC = () => {
  const { logout, user } = useAuth();
  const {
    users,
    stats,
    isLoading,
    createUser,
    isCreating,
    error,
    createdUserData,
    resetStatus
  } = useAdmin();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.USER);
  const [copied, setCopied] = useState(false);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    createUser(
      { email: newEmail, role: newRole },
      {
        onSuccess: () => {
          setNewEmail("");
        },
      }
    );
  };

  const handleCopyPassword = () => {
    const pwd = createdUserData?.temporary_password;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetStatus();
  };

  const getSecretCount = (userId: string) => {
    if (!stats) return 0;
    const stat = stats.find((s) => s.user_id === userId);
    return stat ? stat.secret_count : 0;
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand" style={{ padding: "24px", display: "flex", gap: "10px", alignItems: "center" }}>
          <Lock size={20} style={{ color: "var(--primary)" }} />
          <span style={{ fontWeight: 700, fontSize: "18px", color: "#fff" }}>KeyVault Admin</span>
        </div>

        <div className="sidebar-scroll" style={{ padding: "0 16px" }}>
          <div className="sidebar-section">
            <div className="sidebar-section-title">Navigation</div>
            <button className="sidebar-item active">
              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Users size={16} /> Users & Stats
              </span>
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{user?.email[0].toUpperCase() || "A"}</div>
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

      {/* Main content */}
      <main className="main-content">
        <header className="topbar">
          <h1 className="page-title">Admin Dashboard</h1>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <UserPlus size={16} /> Add User Account
          </button>
        </header>

        <section className="content-body animate-fade-in">
          {/* Quick Metrics */}
          <div className="card-grid" style={{ marginBottom: "40px" }}>
            <MetricCard
              title="Total Users"
              value={isLoading ? "..." : users?.length || 0}
              icon={Users}
              iconColor="var(--primary)"
            />
            <MetricCard
              title="Total Secure Secrets"
              value={
                isLoading
                  ? "..."
                  : stats?.reduce((acc, curr) => acc + curr.secret_count, 0) || 0
              }
              icon={BarChart3}
              iconColor="var(--accent)"
            />
          </div>

          {/* Users Directory Table using generic Table Component */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>User Directory</h2>

            {isLoading ? (
              <div className="empty-state">Loading users...</div>
            ) : (
              <Table<UserResponse>
                data={users}
                headers={["Email Address", "Access Level", "Secret Count", "Created Date"]}
                emptyMessage="No users registered in the vault."
                renderRow={(u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>
                        {u.role === UserRole.ADMIN ? (
                          <ShieldCheck size={12} style={{ marginRight: "4px" }} />
                        ) : null}
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge-count">{getSecretCount(u.id)} secrets</span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )}
              />
            )}
          </div>
        </section>
      </main>

      {/* Add User Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Create User Account">
        {error && (
          <div className="alert alert-danger">
            <span>{error.message}</span>
          </div>
        )}

        {!createdUserData?.temporary_password ? (
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-email">
                User Email Address
              </label>
              <input
                id="new-email"
                type="email"
                className="form-input"
                placeholder="user@domain.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                disabled={isCreating}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-role">
                Access Role
              </label>
              <select
                id="new-role"
                className="form-input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                disabled={isCreating}
              >
                <option value={UserRole.USER}>Standard User (Vault Owner)</option>
                <option value={UserRole.ADMIN}>System Administrator</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModal}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>
                {isCreating ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="alert alert-success">
              <span>User account created successfully!</span>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              Please share this temporary password securely with the user. They will need it to gain access and
              derive their master keys.
            </p>

            <div className="secret-val-container" style={{ margin: "8px 0" }}>
              <span className="secret-value" style={{ fontSize: "16px", color: "#fff", fontWeight: 700 }}>
                {createdUserData.temporary_password}
              </span>
              <button className="icon-btn" onClick={handleCopyPassword}>
                {copied ? <Check size={18} style={{ color: "var(--success)" }} /> : <Copy size={18} />}
              </button>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary btn-block" onClick={handleCloseModal}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
