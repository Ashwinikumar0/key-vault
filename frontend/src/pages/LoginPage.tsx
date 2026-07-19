import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { KeyRound, ShieldAlert } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || "");
  const [password, setPassword] = useState(import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <div className="empty-icon" style={{ borderColor: "var(--primary)" }}>
              <KeyRound size={32} style={{ color: "var(--primary)" }} />
            </div>
          </div>
          <h2 className="auth-title">KeyVault</h2>
          <p className="auth-subtitle">Zero-Knowledge End-to-End Encrypted Vault</p>
        </div>

        {error && (
          <div className="alert alert-danger animate-fade-in">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "28px" }}>
            <label className="form-label" htmlFor="password">
              Master Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              We never see your password. Encryption happens client-side.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deriving Keys & Logging in..." : "Access Vault"}
          </button>
        </form>
      </div>
    </div>
  );
};
