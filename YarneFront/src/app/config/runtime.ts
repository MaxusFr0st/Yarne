export type YarneRuntimeConfig = {
  apiUrl?: string;
};

declare global {
  interface Window {
    __YARNE_CONFIG__?: YarneRuntimeConfig;
  }
}

export {};
