import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // send HttpOnly cookies (access/refresh tokens)
  headers: {
    "Content-Type": "application/json",
  },
});

const AUTH_FLOW_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/verify-mfa",
  "/auth/mfa/setup-with-challenge",
  "/auth/mfa/confirm-with-challenge",
  "/auth/refresh",
];

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

function attemptRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;

    const isAuthFlowRequest = config?.url ? AUTH_FLOW_PATHS.some((path) => config.url!.includes(path)) : false;

    if (error.response?.status === 401 && config && !config._retry && !isAuthFlowRequest) {
      config._retry = true;

      const refreshed = await attemptRefresh();
      if (refreshed) {
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  },
);