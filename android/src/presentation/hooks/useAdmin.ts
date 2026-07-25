import { useState, useEffect, useCallback } from "react";
import { UserStat } from "@/domain/types";
import { adminApi } from "@/data/api/adminApi";

export function useAdmin() {
  const [stats, setStats] = useState<UserStat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getStats();
      setStats(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Failed to fetch admin stats:", err);
      setStats([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const createUser = async (email: string, role: string) => {
    if (!email.trim()) {
      setErrorText("Email address is required.");
      return;
    }

    setIsCreating(true);
    setErrorText(null);
    setTempPasswordResult(null);

    try {
      const res = await adminApi.createUser(email.trim(), role);
      setTempPasswordResult(res.temporary_password);
      await loadStats();
      return res;
    } catch (err: any) {
      setErrorText(err.message || "Failed to create user account.");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    stats,
    isLoading,
    isCreating,
    tempPasswordResult,
    errorText,
    loadStats,
    createUser,
    setErrorText,
    setTempPasswordResult,
  };
}
