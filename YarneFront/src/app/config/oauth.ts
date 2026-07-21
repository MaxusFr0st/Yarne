function readEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export const googleClientId = readEnv("VITE_GOOGLE_CLIENT_ID");

export const isGoogleOAuthEnabled = googleClientId.length > 0;
export const isOAuthEnabled = isGoogleOAuthEnabled;
