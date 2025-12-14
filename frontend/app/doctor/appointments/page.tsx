"use client"

import { useEffect, useState } from "react"
import { getDoctorAppointments, updateAppointmentStatus, updatePrescription } from "@/lib/api-extended"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Appointment {
  appointment_id: string
  patient_name: string
  contact_number: string
  preferred_date: string
  preferred_time: string
  concern?: string
  status: string
  created_at: string
  prescription?: string
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [editingPrescription, setEditingPrescription] = useState<string | null>(null)
  const [prescriptionText, setPrescriptionText] = useState("")

  useEffect(() => {
    async function fetchAppointments() {
      setLoading(true)
      setError("")
      try {
        const res = await getDoctorAppointments()
        setAppointments(res.appointments || [])
      } catch (err: any) {
        setError("Failed to load appointments")
      } finally {
        setLoading(false)
      }
    }
    fetchAppointments()
  }, [])

  const handleSavePrescription = async (appointmentId: string) => {
    try {
      await updatePrescription(appointmentId, prescriptionText);
      setEditingPrescription(null);
      setPrescriptionText("");
      // Refresh appointments
      const updated = await getDoctorAppointments();
      setAppointments(updated.appointments || []);
    } catch (err: any) {
      alert("Failed to save prescription: " + (err.message || err));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Doctor Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            {loading ? (
              <div>Loading...</div>
            ) : appointments.length === 0 ? (
              <div>No appointments found.</div>
            ) : (
              <div className="space-y-4">
                {appointments.map(apt => (
                  <div key={apt.appointment_id} className="p-4 border rounded bg-white/60">
                    <div className="font-medium text-[#2C3E50]">
                      Patient: {apt.patient_name}
                    </div>
                    <div>Date: {apt.preferred_date} | Time: {apt.preferred_time}</div>
                    <div>Status: <span className="font-semibold">{apt.status}</span></div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateAppointmentStatus(apt.appointment_id, "scheduled");
                            const updated = await getDoctorAppointments();
                            setAppointments(updated.appointments || []);
                          } catch (err: any) {
                            alert("Failed to update status: " + (err.message || err));
                          }
                        }}
                        disabled={apt.status === "scheduled"}
                      >
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateAppointmentStatus(apt.appointment_id, "completed");
                            const updated = await getDoctorAppointments();
                            setAppointments(updated.appointments || []);
                          } catch (err: any) {
                            alert("Failed to update status: " + (err.message || err));
                          }
                        }}
                        disabled={apt.status === "completed"}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateAppointmentStatus(apt.appointment_id, "rejected");
                            const updated = await getDoctorAppointments();
                            setAppointments(updated.appointments || []);
                          } catch (err: any) {
                            alert("Failed to update status: " + (err.message || err));
                          }
                        }}
                        disabled={apt.status === "rejected"}
                      >
                        Reject
                      </Button>
                    </div>
                    {apt.concern && <div>Concern: {apt.concern}</div>}
                    <div className="text-xs text-gray-500">Booked at: {new Date(apt.created_at).toLocaleString()}</div>
                    <div className="mt-2">
                      {editingPrescription === apt.appointment_id ? (
                        <div>
                          <textarea
                            className="w-full border rounded p-2"
                            rows={2}
                            value={prescriptionText}
                            onChange={e => setPrescriptionText(e.target.value)}
                            placeholder="Enter prescription"
                          />
                          <Button
                            onClick={() => handleSavePrescription(apt.appointment_id)}
                            className="mt-2 bg-[#2D5A27] text-white"
                          >
                            Save Prescription
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingPrescription(null)}
                            className="mt-2 ml-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div>
                            <span className="font-medium">Prescription: </span>
                            {apt.prescription ? (
                              <span>{apt.prescription}</span>
                            ) : (
                              <span className="italic text-gray-500">None</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingPrescription(apt.appointment_id)
                              setPrescriptionText(apt.prescription || "")
                            }}
                            className="mt-1"
                          >
                            {apt.prescription ? "Edit" : "Add"} Prescription
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
