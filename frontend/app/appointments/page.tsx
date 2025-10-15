"use client"

import { useEffect, useState } from "react"
import { getAppointments } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Appointment {
  appointment_id: string
  patient_name: string
  doctor: {
    id: string
    name: string
    specialty: string
  }
  preferred_date: string
  preferred_time: string
  status: string
  concern?: string
  created_at: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function fetchAppointments() {
      setLoading(true)
      setError("")
      try {
        const res = await getAppointments()
        setAppointments(res.appointments || [])
      } catch (err: any) {
        setError("Failed to load appointments")
      } finally {
        setLoading(false)
      }
    }
    fetchAppointments()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>My Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#2C3E50] opacity-70 mb-4">No appointments found.</p>
                <Button onClick={() => router.push("/appointments/book")} className="bg-[#2D5A27] text-white">
                  Book an Appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.appointment_id} className="p-4 bg-white/70 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-[#2D5A27] mb-1">
                        {apt.doctor?.name} <span className="text-xs text-[#2C3E50] opacity-70">({apt.doctor?.specialty})</span>
                      </div>
                      <div className="text-sm text-[#2C3E50]">
                        Patient: <span className="font-medium">{apt.patient_name}</span>
                      </div>
                      <div className="text-sm text-[#2C3E50]">
                        Date: <span className="font-medium">{apt.preferred_date}</span> &nbsp; | &nbsp;
                        Time: <span className="font-medium">{apt.preferred_time}</span>
                      </div>
                      <div className="text-sm text-[#2C3E50]">
                        Status: <span className="font-medium">{apt.status}</span>
                      </div>
                      {apt.concern && (
                        <div className="text-sm text-[#2C3E50] mt-1">
                          <span className="font-semibold">Notes:</span> {apt.concern}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 md:mt-0">
                      <span className="text-xs text-[#2C3E50] opacity-60">
                        Booked: {new Date(apt.created_at).toLocaleString()}
                      </span>
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
