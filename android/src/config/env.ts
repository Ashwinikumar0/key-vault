import { Platform } from "react-native";

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8080/api",
  API_BASE_URL_EMULATOR: process.env.EXPO_PUBLIC_API_BASE_URL_EMULATOR || "http://10.0.2.2:8080/api",
  DEFAULT_ADMIN_EMAIL: process.env.EXPO_PUBLIC_DEFAULT_ADMIN_EMAIL || "admin@keyvault.local",
  DEFAULT_ADMIN_PASSWORD: process.env.EXPO_PUBLIC_DEFAULT_ADMIN_PASSWORD || "adminpassword123",
  DEFAULT_ADMIN_AUTH_HASH:
    process.env.EXPO_PUBLIC_DEFAULT_ADMIN_AUTH_HASH ||
    "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  USE_EMBEDDED_DATABASE: process.env.EXPO_PUBLIC_USE_EMBEDDED_DATABASE !== "false",

  getApiBaseUrl: (): string => {
    return Platform.OS === "web"
      ? process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8080/api"
      : process.env.EXPO_PUBLIC_API_BASE_URL_EMULATOR || "http://10.0.2.2:8080/api";
  },
} as const;
