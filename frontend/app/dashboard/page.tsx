"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, ArrowLeft, History, TrendingUp, Calendar, User, LogOut, Upload, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getUserProfile, getAnalysisHistory, getProgressDashboard } from "@/lib/api-extended"
import { isAuthenticated, clearAuth, getUserType } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface Analysis {
  id: string
  created_at: string
  condition: string
  confidence: number
  severity: string
  recommendations: string[]
}

interface ProgressData {
  total_analyses: number
  recent_analyses: number
  average_confidence: number
  common_conditions: string[]
  progress_trend: 'improving' | 'stable' | 'declining'
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== 'user') {
      router.push('/auth/login')
      return
    }

    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [profileRes, historyRes, progressRes] = await Promise.all([
        getUserProfile(),
        getAnalysisHistory(5), // Get last 5 analyses
        getProgressDashboard()
      ])

      setUser(profileRes)
      setAnalyses(historyRes.analyses || [])
      setProgress(progressRes)
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D5A27] mx-auto mb-4"></div>
          <p className="text-[#2C3E50] opacity-70">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center p-4">
        <Card className="glassmorphism border-0 max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/auth/login')} className="bg-[#2D5A27] hover:bg-[#3D7C47]">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8]">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/30 backdrop-blur-lg border-b border-white/20 p-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <Eye className="w-6 h-6 text-[#2D5A27]" />
              <span className="text-lg font-semibold gradient-text font-poppins">EyeCare AI</span>
            </Link>
            <div className="hidden md:flex items-center space-x-2 text-[#2C3E50] opacity-70">
              <User className="w-4 h-4" />
              <span>Welcome, {user?.full_name}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-[#2C3E50] opacity-70 hover:opacity-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glassmorphism border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#2C3E50] font-poppins mb-2">
                    Welcome back, {user?.full_name}!
                  </h1>
                  <p className="text-[#2C3E50] opacity-70">
                    Here's an overview of your eye health journey
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link href="/chat">
                    <Button className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      New Analysis
                    </Button>
                  </Link>
                  <Link href="/history">
                    <Button variant="outline" className="border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white">
                      <History className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glassmorphism border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#2D5A27]/10 rounded-full">
                    <History className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C3E50]">{progress?.total_analyses || 0}</p>
                    <p className="text-sm text-[#2C3E50] opacity-70">Total Analyses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="glassmorphism border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#2D5A27]/10 rounded-full">
                    <TrendingUp className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C3E50]">{progress?.average_confidence ? Math.round(progress.average_confidence) : 0}%</p>
                    <p className="text-sm text-[#2C3E50] opacity-70">Avg Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="glassmorphism border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#2D5A27]/10 rounded-full">
                    <Calendar className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C3E50]">{progress?.recent_analyses || 0}</p>
                    <p className="text-sm text-[#2C3E50] opacity-70">Recent Analyses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Analyses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#2C3E50] font-poppins flex items-center">
                <History className="w-5 h-5 mr-2" />
                Recent Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-[#2C3E50] opacity-30 mx-auto mb-4" />
                  <p className="text-[#2C3E50] opacity-70 mb-4">No analyses yet</p>
                  <Link href="/chat">
                    <Button className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white">
                      Start Your First Analysis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.slice(0, 3).map((analysis, index) => (
                    <motion.div
                      key={analysis.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-white/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#2D5A27]/10 rounded-full flex items-center justify-center">
                          <Eye className="w-6 h-6 text-[#2D5A27]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#2C3E50]">{analysis.condition}</p>
                          <p className="text-sm text-[#2C3E50] opacity-70">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <Progress value={analysis.confidence} className="w-16 h-2" />
                          <span className="text-sm font-medium text-[#2C3E50]">{analysis.confidence}%</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          analysis.severity === 'low' ? 'bg-green-100 text-green-700' :
                          analysis.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {analysis.severity}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {analyses.length > 3 && (
                    <div className="text-center pt-4">
                      <Link href="/history">
                        <Button variant="outline" className="border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white">
                          View All Analyses
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#2C3E50] font-poppins">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  <Link href="/chat">
    <Button className="w-full bg-[#2D5A27] hover:bg-[#3D7C47] text-white h-16 flex flex-col items-center justify-center space-y-2">
      <Upload className="w-5 h-5" />
      <span>New Analysis</span>
    </Button>
  </Link>
  <Link href="/appointments/book">
    <Button variant="outline" className="w-full border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white h-16 flex flex-col items-center justify-center space-y-2">
      <Calendar className="w-5 h-5" />
      <span>Book Appointment</span>
    </Button>
  </Link>
  <Link href="/appointments">
    <Button variant="outline" className="w-full border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white h-16 flex flex-col items-center justify-center space-y-2">
      <Calendar className="w-5 h-5" />
      <span>View All Appointments</span>
    </Button>
  </Link>
  <Link href="/progress">
    <Button variant="outline" className="w-full border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white h-16 flex flex-col items-center justify-center space-y-2">
      <TrendingUp className="w-5 h-5" />
      <span>View Progress</span>
    </Button>
  </Link>
  <Link href="/history">
    <Button variant="outline" className="w-full border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white h-16 flex flex-col items-center justify-center space-y-2">
      <History className="w-5 h-5" />
      <span>Analysis History</span>
    </Button>
  </Link>
</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
