import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const packagerHost = Constants.expoConfig?.hostUri?.split(":")[0];
const BASE_URL =
  configuredApiUrl ??
  (packagerHost ? `http://${packagerHost}:3001` : "http://localhost:3001");
let refreshPromise: Promise<string> | null = null;

export function resolveMediaUrl(url: string) {
  return url.startsWith("/") ? new URL(url, BASE_URL).toString() : url;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Attach token
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("layr_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await AsyncStorage.getItem("layr_refresh_token");
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
              .then(async ({ data }) => {
                const { accessToken, refreshToken: newRefreshToken } = data.data;
                await AsyncStorage.multiSet([
                  ["layr_access_token", accessToken],
                  ["layr_refresh_token", newRefreshToken],
                ]);
                return accessToken as string;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const newToken = await refreshPromise;
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        } catch {
          await AsyncStorage.multiRemove([
            "layr_access_token",
            "layr_refresh_token",
          ]);
        }
      }
    }
    return Promise.reject(err);
  },
);

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post("/api/auth/login", { email, password }),
    register: (data: object) => apiClient.post("/api/auth/register", data),
    me: () => apiClient.get("/api/auth/me"),
    logout: (refreshToken: string) =>
      apiClient.post("/api/auth/logout", { refreshToken }),
  },
  layers: {
    nearby: (lat: number, lng: number, radius = 500) =>
      apiClient.get(
        `/api/layers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      ),
    getById: (id: string) => apiClient.get(`/api/layers/${id}`),
    create: (data: object) => apiClient.post("/api/layers", data),
    react: (id: string, type: string) =>
      apiClient.post(`/api/layers/${id}/react`, { type }),
    delete: (id: string) => apiClient.delete(`/api/layers/${id}`),
  },
  locations: {
    findOrCreate: (data: object) => apiClient.post("/api/locations", data),
    nearby: (lat: number, lng: number, radius = 1000) =>
      apiClient.get(
        `/api/locations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      ),
  },
  media: {
    upload: (file: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      form.append("file", file as unknown as Blob);
      return apiClient.post("/api/media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  },
  ai: {
    summary: (locationId: string) =>
      apiClient.get(`/api/ai/summary/${locationId}`),
    personalize: (lat: number, lng: number) =>
      apiClient.post("/api/ai/personalize", { lat, lng }),
  },
};
