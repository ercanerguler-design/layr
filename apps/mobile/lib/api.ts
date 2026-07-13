import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:3001";

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
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });
          const newToken = data.data.accessToken;
          await AsyncStorage.setItem("layr_access_token", newToken);
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
  ai: {
    summary: (locationId: string) =>
      apiClient.get(`/api/ai/summary/${locationId}`),
    personalize: (lat: number, lng: number) =>
      apiClient.post("/api/ai/personalize", { lat, lng }),
  },
};
