const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Analyze Image (POST /analyze-image)
export async function analyzeImage(
  file: File,
  description?: string,
  symptoms?: string,
  additional_info?: string
) {
  const formData = new FormData();
  formData.append("file", file);
  if (description) formData.append("description", description);
  if (symptoms) formData.append("symptoms", symptoms);
  if (additional_info) formData.append("additional_info", additional_info);

  const res = await fetch(`${BACKEND_URL}/analyze-image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Get Detection Result Image (GET /detection-result/{file_id})
export function getDetectionResultUrl(file_id: string) {
  return `${BACKEND_URL}/detection-result/${file_id}`;
}

// Ask Question (POST /ask-question)
export async function askQuestion(question: string) {
  const res = await fetch(`${BACKEND_URL}/ask-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Get Doctors (GET /doctors)
export async function getDoctors() {
  const res = await fetch(`${BACKEND_URL}/doctors`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Book Appointment (POST /book-appointment)
export async function bookAppointment(data: {
  patient_name: string;
  contact_number: string;
  preferred_date: string;
  preferred_time: string;
  concern?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/book-appointment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Get Appointments (GET /appointments)
export async function getAppointments() {
  const res = await fetch(`${BACKEND_URL}/appointments`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Health Check (GET /health)
export async function healthCheck() {
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
