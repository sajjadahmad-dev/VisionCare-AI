"use client"

import { useEffect, useState } from "react"
import { getDoctors } from "@/lib/api"
import { getUserProfile } from "@/lib/api-extended"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

interface Doctor {
  id: string
  full_name: string
  specialty: string
  experience_years?: number
  license_number?: string
  availability?: { day: string; start: string; end: string }[]
}

interface UserProfile {
  full_name: string
  phone?: string
}

export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError("")
      try {
        // Fetch doctors
        const res = await getDoctors()
        // Map backend doctor fields to expected frontend fields
        const mappedDoctors = (res.doctors || [])
          .filter((doc: any) => !doc.status || doc.status === "approved")
          .map((doc: any) => ({
            id: doc.id || doc._id,
            full_name: doc.full_name || doc.name,
            specialty: doc.specialty,
            experience_years: doc.experience_years,
            license_number: doc.license_number,
            availability: doc.availability,
          }))
        setDoctors(mappedDoctors)

        // Fetch user profile
        const profile = await getUserProfile()
        setUserProfile(profile)
      } catch (err: any) {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      setError("Please select doctor, date, and time")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await import("@/lib/api").then(mod => mod.bookAppointment({
        patient_name: userProfile?.full_name || "",
        contact_number: userProfile?.phone || "",
        preferred_date: selectedDate,
        preferred_time: selectedTime,
        concern: notes,
        doctor_id: selectedDoctor.id,
      }))
      // Optionally show a success message
      router.push("/appointments")
    } catch (err: any) {
      setError(err.message || "Failed to book appointment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Book an Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            <div className="mb-6">
              <label className="block mb-2 font-medium">Select Doctor</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedDoctor?.id || ""}
                onChange={e => {
                  const doc = doctors.find(d => d.id === e.target.value)
                  setSelectedDoctor(doc || null)
                  setSelectedDate("")
                  setSelectedTime("")
                }}
              >
                <option value="">-- Choose a doctor --</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} ({doc.specialty})
                  </option>
                ))}
              </select>
            </div>
            {selectedDoctor && (
              <div className="mb-6">
                <label className="block mb-2 font-medium">Select Day</label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedDay}
                  onChange={e => {
                    setSelectedDay(e.target.value)
                    setSelectedDate("")
                    setSelectedTime("")
                  }}
                >
                  <option value="">-- Choose a day --</option>
                  {Array.from(new Set((selectedDoctor.availability || []).map(a => a.day))).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedDoctor && selectedDay && (
              <div className="mb-6">
                <label className="block mb-2 font-medium">Select Date</label>
                <Input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value)
                    setSelectedTime("")
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  // Only allow dates matching selectedDay
                  onBlur={e => {
                    const date = e.target.value
                    if (date) {
                      const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                        new Date(date).getDay()
                      ]
                      if (dayOfWeek !== selectedDay) {
                        setError(`Please select a date that is a ${selectedDay}`)
                        setSelectedDate("")
                      } else {
                        setError("")
                      }
                    }
                  }}
                />
              </div>
            )}
            {selectedDoctor && selectedDay && selectedDate && (
              <div className="mb-6">
                <label className="block mb-2 font-medium">Select Time</label>
                {(() => {
                  const avail = (selectedDoctor.availability || []).find(a => a.day === selectedDay)
                  if (!avail) return <div className="text-sm text-red-600">No time range set for this day.</div>
                  return (
                    <Input
                      type="time"
                      className="w-full p-2 border rounded"
                      value={selectedTime}
                      min={avail.start}
                      max={avail.end}
                      onChange={e => setSelectedTime(e.target.value)}
                    />
                  )
                })()}
              </div>
            )}
            <div className="mb-6">
              <label className="block mb-2 font-medium">Notes (optional)</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Describe your symptoms or any special requests"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleBook} className="w-full bg-[#2D5A27] text-white" disabled={loading}>
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
