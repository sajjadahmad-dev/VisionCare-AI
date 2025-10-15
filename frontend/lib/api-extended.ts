// Extended API functions for authentication and new endpoints
import { getAuthHeaders } from './auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Admin Authentication
 */
export async function adminLogin(password: string) {
  const res = await fetch(`${BACKEND_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// User Authentication
export async function userSignup(data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function userLogin(data: { email: string; password: string }) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUserProfile() {
  const headers = getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/auth/profile`, {
    method: "GET",
    headers: headers.Authorization ? { "Content-Type": "application/json", ...headers } : { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Doctor Authentication
export async function doctorSignup(data: FormData | {
  email: string;
  password: string;
  full_name: string;
  specialty: string;
  experience_years: number;
  license_number: string;
  phone?: string;
  bio?: string;
}) {
  const isFormData = data instanceof FormData;
  const res = await fetch(`${BACKEND_URL}/auth/doctor/signup`, {
    method: "POST",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    body: isFormData ? data : JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function doctorLogin(data: { email: string; password: string }) {
  const url = `${BACKEND_URL}/auth/doctor/login`;
  // eslint-disable-next-line no-console
  console.log("Doctor login request URL:", url, "data:", data);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errorText = await res.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.detail || errorJson.message || errorText);
    } catch {
      throw new Error(errorText);
    }
  }
  return res.json();
}

export async function getDoctorProfile() {
  const headers = getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/auth/doctor/profile`, {
    method: "GET",
    headers: headers.Authorization ? { "Content-Type": "application/json", ...headers } : { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Doctor Availability
export async function setDoctorAvailability(availability: Array<{
  date: string;
  time_slots: string[];
}>) {
  const res = await fetch(`${BACKEND_URL}/doctor/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ availability }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDoctorAvailability() {
  const res = await fetch(`${BACKEND_URL}/doctor/availability`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDoctorAvailabilityPublic(doctorId: string) {
  const res = await fetch(`${BACKEND_URL}/doctor/${doctorId}/availability`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// User Dashboard APIs
export async function getAnalysisHistory(limit?: number, skip?: number) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (skip) params.append('skip', skip.toString());

  const res = await fetch(`${BACKEND_URL}/history?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAnalysisDetail(analysisId: string) {
  const res = await fetch(`${BACKEND_URL}/history/${analysisId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProgressDashboard() {
  const res = await fetch(`${BACKEND_URL}/progress-dashboard`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getProgressChartUrl() {
  return `${BACKEND_URL}/progress-chart`;
}

export function getComparisonUrl(analysisId: string) {
  return `${BACKEND_URL}/comparison/${analysisId}`;
}

/**
 * Admin: Get doctor documents (CNIC, certificate, etc.)
 */
export async function getAdminDoctorDocuments(doctorId: string) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BACKEND_URL}/admin/doctors/${doctorId}/documents`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Doctor Dashboard APIs
export async function getDoctorDashboard() {
  const res = await fetch(`${BACKEND_URL}/doctor/dashboard`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDoctorAppointments(status?: string, limit?: number, skip?: number) {
  const params = new URLSearchParams();
  if (status) params.append('status_filter', status);
  if (limit) params.append('limit', limit.toString());
  if (skip) params.append('skip', skip.toString());

  const res = await fetch(`${BACKEND_URL}/doctor/appointments?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateAppointmentStatus(appointmentId: string, status: string, notes?: string) {
  const res = await fetch(`${BACKEND_URL}/doctor/appointments/${appointmentId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
