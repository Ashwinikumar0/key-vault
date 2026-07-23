import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useAuthSession } from "../hooks/useAuthSession";
import type { UserResponse } from "../utils/api";

import { exportEncryptionKey, importEncryptionKey } from "../utils/cryptoUtils";

interface AuthContextType {
  user: UserResponse | null;
  encryptionKey: CryptoKey | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearEncryptionKey: () => void;
  loginError: Error | null;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in ms

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Consume extracted hooks from hooks/ folder
  const {
    sessionUser,
    sessionLoading,
    login: loginApi,
    isLoggingIn,
    loginError,
    clearLoginError,
    logout: logoutApi,
  } = useAuthSession(
    async (loggedUser, derivedKey) => {
      // On Login Success callback
      setUser(loggedUser);
      setEncryptionKey(derivedKey);
      try {
        const exportedKey = await exportEncryptionKey(derivedKey);
        sessionStorage.setItem("keyvault_enc_key", exportedKey);
      } catch (err) {
        console.error("Failed to store session encryption key:", err);
      }
    },
    () => {
      // On Logout Success callback
      sessionStorage.removeItem("keyvault_enc_key");
      setUser(null);
      setEncryptionKey(null);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      // Redirect user directly to welcome/login page on logout
      window.location.href = "/login";
    }
  );

  // Sync session user into context state on mount & restore encryption key from tab storage if present
  useEffect(() => {
    const syncSessionAndKey = async () => {
      if (sessionUser !== undefined) {
        setUser(sessionUser);
        if (sessionUser && !encryptionKey) {
          const storedKey = sessionStorage.getItem("keyvault_enc_key");
          if (storedKey) {
            try {
              const importedKey = await importEncryptionKey(storedKey);
              setEncryptionKey(importedKey);
            } catch (err) {
              console.error("Failed to restore session encryption key:", err);
            }
          }
        }
      }
    };
    syncSessionAndKey();
  }, [sessionUser]);

  const login = async (email: string, password: string) => {
    await loginApi({ email, password });
  };

  const logout = async () => {
    sessionStorage.removeItem("keyvault_enc_key");
    await logoutApi();
  };

  const clearEncryptionKey = () => {
    sessionStorage.removeItem("keyvault_enc_key");
    setEncryptionKey(null);
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Only set timer if the user is authenticated AND the key is in memory
    if (user && encryptionKey) {
      timeoutRef.current = window.setTimeout(() => {
        console.warn("Inactivity timeout reached. Logging out...");
        logout();
      }, INACTIVITY_LIMIT);
    }
  };

  // Setup inactivity event listeners
  useEffect(() => {
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    if (user && encryptionKey) {
      resetInactivityTimer();
      activityEvents.forEach((event) => {
        window.addEventListener(event, handleActivity);
      });
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, encryptionKey]);

  const isLoading = sessionLoading || isLoggingIn;

  return (
    <AuthContext.Provider
      value={{
        user,
        encryptionKey,
        isLoading,
        login,
        logout,
        clearEncryptionKey,
        loginError,
        clearLoginError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
