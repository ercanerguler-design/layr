import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
let refreshPromise: Promise<string> | null = null;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Attach JWT from localStorage on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("layr_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem("layr_refresh_token");
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
              .then(({ data }) => {
                const { accessToken, refreshToken: newRefreshToken } = data.data;
                localStorage.setItem("layr_access_token", accessToken);
                localStorage.setItem("layr_refresh_token", newRefreshToken);
                return accessToken as string;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const newToken = await refreshPromise;
          localStorage.setItem("layr_access_token", newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem("layr_access_token");
          localStorage.removeItem("layr_refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  },
);

// ─── Typed API helpers ─────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post("/api/auth/login", { email, password }),
    register: (data: {
      email: string;
      username: string;
      displayName: string;
      password: string;
    }) => apiClient.post("/api/auth/register", data),
    me: () => apiClient.get("/api/auth/me"),
    logout: (refreshToken: string) =>
      apiClient.post("/api/auth/logout", { refreshToken }),
  },

  layers: {
    nearby: (lat: number, lng: number, radius = 500) =>
      apiClient.get(
        `/api/layers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      ),
    byLocation: (locationId: string, year?: number) =>
      apiClient.get(
        `/api/layers/location/${locationId}${year ? `?year=${year}` : ""}`,
      ),
    getById: (id: string) => apiClient.get(`/api/layers/${id}`),
    create: (data: object) => apiClient.post("/api/layers", data),
    react: (id: string, type: string) =>
      apiClient.post(`/api/layers/${id}/react`, { type }),
    delete: (id: string) => apiClient.delete(`/api/layers/${id}`),
  },

  locations: {
    search: (q: string) =>
      apiClient.get(`/api/locations/search?q=${encodeURIComponent(q)}`),
    nearby: (lat: number, lng: number, radius = 1000) =>
      apiClient.get(
        `/api/locations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      ),
    getById: (id: string) => apiClient.get(`/api/locations/${id}`),
    timeTravel: (id: string, year: number) =>
      apiClient.get(`/api/locations/${id}/time-travel?year=${year}`),
    findOrCreate: (data: object) => apiClient.post("/api/locations", data),
  },

  ai: {
    summary: (locationId: string) =>
      apiClient.get(`/api/ai/summary/${locationId}`),
    narrate: (locationId: string, opts: object) =>
      apiClient.post(`/api/ai/narrate/${locationId}`, opts),
    analyzeProduct: (data: object) => apiClient.post("/api/ai/product", data),
    personalize: (lat: number, lng: number) =>
      apiClient.post("/api/ai/personalize", { lat, lng }),
    timeNarrate: (locationId: string, year: number) =>
      apiClient.post("/api/ai/time-narrate", { locationId, year }),
  },

  media: {
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiClient.post("/api/media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    presign: (filename: string, mimeType: string, size: number) =>
      apiClient.post("/api/media/presign", { filename, mimeType, size }),
  },

  users: {
    profile: (username: string) => apiClient.get(`/api/users/${username}`),
    updateMe: (data: object) => apiClient.patch("/api/users/me", data),
    follow: (username: string) =>
      apiClient.post(`/api/users/${username}/follow`),
    unfollow: (username: string) =>
      apiClient.delete(`/api/users/${username}/follow`),
  },
};
