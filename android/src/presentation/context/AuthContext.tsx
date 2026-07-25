import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/domain/types";
import { deriveKeys } from "@/domain/crypto";
import { authApi } from "@/data/api/authApi";

interface AuthContextType {
  user: User | null;
  encryptionKey: CryptoKey | null;
  isLoading: boolean;
  login: (email: string, passwordRaw: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      setUser(null);
      setEncryptionKey(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, passwordRaw: string) => {
    setIsLoading(true);
    try {
      const { authHash, encryptionKey: derivedKey } = await deriveKeys(passwordRaw, email);
      const loggedUser = await authApi.login(email, authHash);

      setUser(loggedUser);
      setEncryptionKey(derivedKey);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      setUser(null);
      setEncryptionKey(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        encryptionKey,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
