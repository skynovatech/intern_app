import axios from "axios";
import type { TokenResponse } from "@/types";

export const API_ORIGIN = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "https://intern-app-lxil.onrender.com"
).replace(/\/$/, "");

// Backend routes are mounted under /api. Keeping this prefix here means every
// API call in the frontend uses the same deployed backend origin.
const API_BASE_URL = `${API_ORIGIN}/api`;

export function getBackendAssetUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}/${path.replace(/^\//, "")}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ats_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("ats_refresh_token");
      if (!refreshToken) {
        localStorage.removeItem("ats_token");
        localStorage.removeItem("ats_refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newToken = res.data.access_token;
        localStorage.setItem("ats_token", newToken);
        localStorage.setItem("ats_refresh_token", res.data.refresh_token);

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("ats_token");
        localStorage.removeItem("ats_refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
