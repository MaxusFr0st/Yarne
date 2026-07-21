import { apiRequest } from "./client";

export interface AuthResponse {
  email: string;
  userName: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export interface AuthSessionResponse {
  email: string;
  fullName: string;
  userName: string;
  phoneNumber: string | null;
  role: string;
  expiresAt: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CustomerProfileResponse {
  email: string;
  fullName: string;
  phoneNumber: string | null;
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/api/auth/me", { skipAuthExpire: true });
}

export async function fetchCustomerProfile(): Promise<CustomerProfileResponse> {
  return apiRequest<CustomerProfileResponse>("/api/auth/me");
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/api/auth/logout", { method: "POST", skipAuthExpire: true });
}

/** Rotate refresh cookie → new access cookie. Returns session fields for UI state. */
export async function refreshSession(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/refresh", {
    method: "POST",
    skipAuthExpire: true,
  });
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
    // Credentials failure must not clear an existing cookie session via auth-expired.
    skipAuthExpire: true,
  });
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuthExpire: true,
  });
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
    skipAuthExpire: true,
  });
}
