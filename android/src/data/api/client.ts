import axios from "axios";
import { Platform } from "react-native";

// Dynamic API base URL: localhost for Web/browser, 10.0.2.2 for Android Virtual Device
const API_BASE_URL = Platform.OS === "web"
  ? "http://localhost:8080/api"
  : "http://10.0.2.2:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    return Promise.reject(error);
  }
);
