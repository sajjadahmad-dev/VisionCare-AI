"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, Calendar, Clock, CheckCircle, XCircle, Users, LogOut, User } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDoctorDashboard, getDoctorProfile } from "@/lib/api-extended"
import { clearAuth, getUserType } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface DashboardData {
  total_appointments: number
  pending_appointments: number
  confirmed_appointments: number
  completed_appointments: number
  today_appointments: number
  upcoming_appointments: number
}

interface RecentAppointment {
  appointment_id: string
  patient_name: string
  preferred_date: string
  preferred_time: string
  status: string
  concern?: string
  created_at: string
}

export default function DoctorDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const [doctorProfile, setDoctorProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const userType = getUserType()
    if (userType !== 'doctor') {
      router.push('/auth/doctor/login')
      return
    }

    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [dashboardRes, profileRes] = await Promise.all([
        getDoctorDashboard(),
        getDoctorProfile()
      ])

      if (dashboardRes.status === 'success') {
        setDashboardData(dashboardRes.dashboard)
        setRecentAppointments(dashboardRes.recent_appointments || [])
      }

      if (profileRes.status === 'success') {
        setDoctorProfile(profileRes.doctor)
        // Check if doctor is approved
        if (profileRes.doctor.status !== 'approved') {
          clearAuth()
          router.push('/auth/doctor/login')
          return
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D5A27] mx-auto"></div>
          <p className="mt-4 text-[#2C3E50]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#2C3E50] mb-2">Error</h2>
            <p className="text-[#2C3E50] opacity-70 mb-4">{error}</p>
            <Button onClick={loadDashboardData} className="bg-[#2D5A27] hover:bg-[#3D7C47]">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3">
                <Eye className="w-8 h-8 text-[#2D5A27]" />
                <span className="text-2xl font-bold gradient-text font-poppins">EyeCare AI</span>
              </Link>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-[#2C3E50]">Doctor Dashboard</h1>
                {doctorProfile && (
                  <p className="text-sm text-[#2C3E50] opacity-70">
                    Welcome back, Dr. {doctorProfile.full_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/doctor/appointments">
                <Button variant="outline" className="border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Appointments
                </Button>
              </Link>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {dashboardData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-[#2D5A27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2D5A27]">{dashboardData.total_appointments}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dashboardData.pending_appointments}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Today's Appointments</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardData.today_appointments}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Confirmed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData.confirmed_appointments}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{dashboardData.completed_appointments}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Upcoming</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{dashboardData.upcoming_appointments}</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#2C3E50]">Recent Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAppointments.length === 0 ? (
                <p className="text-[#2C3E50] opacity-70 text-center py-8">No recent appointments</p>
              ) : (
                <div className="space-y-4">
                  {recentAppointments.map((appointment) => (
                    <div key={appointment.appointment_id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <User className="w-5 h-5 text-[#2D5A27]" />
                          <div>
                            <p className="font-medium text-[#2C3E50]">{appointment.patient_name}</p>
                            <p className="text-sm text-[#2C3E50] opacity-70">
                              {appointment.preferred_date} at {appointment.preferred_time}
                            </p>
                            {appointment.concern && (
                              <p className="text-sm text-[#2C3E50] opacity-70 mt-1">
                                Concern: {appointment.concern}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 text-center">
                <Link href="/doctor/appointments">
                  <Button className="bg-[#2D5A27] hover:bg-[#3D7C47]">
                    View All Appointments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
