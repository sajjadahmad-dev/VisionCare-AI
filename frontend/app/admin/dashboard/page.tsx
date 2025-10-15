"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Eye,
  Users,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Doctor {
  id: string
  email: string
  full_name: string
  specialty: string
  experience_years: number
  license_number: string
  phone?: string
  bio?: string
  status: string
  created_at: string
}

interface DashboardStats {
  total_doctors: number
  pending_doctors: number
  approved_doctors: number
  rejected_doctors: number
  total_users: number
  total_appointments: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingDoctors, setPendingDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.push("/auth/admin/login")
      return
    }

    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch("http://localhost:8000/admin/dashboard", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.dashboard)
        setPendingDoctors(data.pending_doctors)
      } else {
        setError("Failed to load dashboard data")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDoctorAction = async (doctorId: string, action: "approve" | "reject", notes?: string) => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`http://localhost:8000/admin/doctors/${doctorId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action, notes })
      })

      if (response.ok) {
        // Refresh data
        fetchDashboardData()
      } else {
        setError("Failed to update doctor status")
      }
    } catch (err) {
      setError("Network error")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/auth/admin/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center">
        <div className="text-[#2D5A27] text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E8F5E8] shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className="w-8 h-8 text-[#2D5A27]" />
              <h1 className="text-2xl font-bold text-[#2C3E50] font-poppins">Admin Dashboard</h1>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-[#2D5A27]/20 text-[#2D5A27] hover:bg-[#E8F5E8]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Total Doctors</CardTitle>
                <Users className="h-4 w-4 text-[#2D5A27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2D5A27]">{stats.total_doctors}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-[#FFD93D]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#FFD93D]">{stats.pending_doctors}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Approved Doctors</CardTitle>
                <UserCheck className="h-4 w-4 text-[#2D5A27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2D5A27]">{stats.approved_doctors}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Total Users</CardTitle>
                <Users className="h-4 w-4 text-[#2D5A27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2D5A27]">{stats.total_users}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-[#2D5A27]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2D5A27]">{stats.total_appointments}</div>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#2C3E50]">Rejected Doctors</CardTitle>
                <UserX className="h-4 w-4 text-[#dc3545]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#dc3545]">{stats.rejected_doctors}</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending Doctors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#2C3E50] font-poppins">
                Pending Doctor Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingDoctors.length === 0 ? (
                <p className="text-[#2C3E50] opacity-70">No pending doctor applications.</p>
              ) : (
                <div className="space-y-4">
                  {pendingDoctors.map((doctor) => (
                    <DoctorApprovalCard key={doctor.id} doctor={doctor} onApprove={handleDoctorAction} onReject={handleDoctorAction} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

import { getAdminDoctorDocuments } from "@/lib/api-extended";

// Utility to get relative path for proxy
function getRelativeDocPath(filePath: string) {
  // Normalize for both Windows and Unix paths, and ensure forward slashes
  const normalized = filePath.replace(/\\/g, "/");
  // Always extract the path starting from "backend/uploads"
  const match = normalized.match(/backend\/uploads[^\s]*/);
  return match ? match[0] : normalized;
}

function DoctorApprovalCard({
  doctor,
  onApprove,
  onReject,
}: {
  doctor: Doctor;
  onApprove: (id: string, action: "approve" | "reject", notes?: string) => void;
  onReject: (id: string, action: "approve" | "reject", notes?: string) => void;
}) {
  const [showDocs, setShowDocs] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState("");

  const handleViewDocuments = async () => {
    setShowDocs(!showDocs);
    if (!showDocs && docs.length === 0) {
      setLoadingDocs(true);
      setDocsError("");
      try {
        const res = await getAdminDoctorDocuments(doctor.id);
        setDocs(res.documents || []);
      } catch (err: any) {
        setDocsError("Failed to load documents");
      } finally {
        setLoadingDocs(false);
      }
    }
  };

  return (
    <div className="border border-[#2C3E50]/20 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-[#2C3E50]">{doctor.full_name}</h3>
          <p className="text-[#2C3E50] opacity-70">{doctor.email}</p>
          <p className="text-[#2C3E50] opacity-70">{doctor.specialty}</p>
          <p className="text-sm text-[#2C3E50] opacity-60">
            Experience: {doctor.experience_years} years
          </p>
          <p className="text-sm text-[#2C3E50] opacity-60">
            License: {doctor.license_number}
          </p>
          <p className="text-sm text-[#2C3E50] opacity-60">
            Applied: {new Date(doctor.created_at).toLocaleDateString()}
          </p>
          <Button
            variant="outline"
            className="mt-2 border-[#2D5A27] text-[#2D5A27] hover:bg-[#E8F5E8]"
            size="sm"
            onClick={handleViewDocuments}
          >
            {showDocs ? "Hide Documents" : "View Documents"}
          </Button>
          {showDocs && (
            <div className="mt-3">
              {loadingDocs && <div className="text-sm text-[#2D5A27]">Loading documents...</div>}
              {docsError && <div className="text-sm text-red-600">{docsError}</div>}
              {docs.length > 0 && (
                <>
                  {console.log("Doctor documents for", doctor.full_name, docs)}
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div key={doc.type} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-[#2C3E50] capitalize">{doc.type.replace("_", " ")}:</span>
                        {doc.exists && (doc.file_extension === ".jpg" || doc.file_extension === ".jpeg" || doc.file_extension === ".png") ? (
                          <a href={`http://localhost:8000/uploads/doctor_documents/${encodeURIComponent(doc.filename)}`} target="_blank" rel="noopener noreferrer">
                            <img src={`http://localhost:8000/uploads/doctor_documents/${encodeURIComponent(doc.filename)}`} alt={doc.type} className="w-20 h-14 object-cover border rounded" />
                          </a>
                        ) : doc.exists && doc.file_extension === ".pdf" ? (
                          <a
                            href={`http://localhost:8000/uploads/doctor_documents/${encodeURIComponent(doc.filename)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2D5A27] underline"
                          >
                            View PDF
                          </a>
                        ) : (
                          <span className="text-xs text-red-500">Not uploaded</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2 ml-4">
          <Button
            onClick={() => onApprove(doctor.id, "approve")}
            className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            onClick={() => onReject(doctor.id, "reject")}
            variant="destructive"
            size="sm"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
