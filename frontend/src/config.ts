export type AppConfig = {
  API_BASE_URL: string;
};

const fallbackApiBaseUrl = "http://localhost:8000";

const readRuntimeConfig = (): Partial<AppConfig> => {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__APP_CONFIG__ ?? {};
};

const runtimeConfig = readRuntimeConfig();

export const API_BASE_URL = (runtimeConfig.API_BASE_URL || fallbackApiBaseUrl).replace(/\/$/, "");

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

export {};
