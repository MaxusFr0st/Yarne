import { apiRequest } from "./client";

export interface AuthResponse {
  token: string;
  email: string;
  userName: string;
  fullName: string;
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

export async function fetchCustomerProfile(): Promise<CustomerProfileResponse> {
  return apiRequest<CustomerProfileResponse>("/api/auth/me");
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export async function loginWithApple(idToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/auth/apple", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}
