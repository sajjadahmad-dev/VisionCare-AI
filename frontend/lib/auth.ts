// Authentication utilities for JWT token management

const TOKEN_KEY = 'eye_health_token';
const USER_TYPE_KEY = 'eye_health_user_type';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
}

export interface Doctor {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  experience_years: number;
  license_number: string;
  phone?: string;
  bio?: string;
}

export function setAuthToken(token: string, userType: 'user' | 'doctor' | 'admin') {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_TYPE_KEY, userType);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function getUserType(): 'user' | 'doctor' | 'admin' | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_TYPE_KEY) as 'user' | 'doctor' | 'admin' | null;
  }
  return null;
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_TYPE_KEY);
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
