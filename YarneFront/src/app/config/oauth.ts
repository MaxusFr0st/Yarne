function readEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export const googleClientId = readEnv("VITE_GOOGLE_CLIENT_ID");
export const appleClientId = readEnv("VITE_APPLE_CLIENT_ID");
export const appleRedirectUri = readEnv("VITE_APPLE_REDIRECT_URI");

export const isGoogleOAuthEnabled = googleClientId.length > 0;
export const isAppleOAuthEnabled = appleClientId.length > 0;
export const isOAuthEnabled = isGoogleOAuthEnabled || isAppleOAuthEnabled;
