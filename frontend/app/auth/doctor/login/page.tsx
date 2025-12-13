"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, ArrowLeft, Mail, Lock, EyeOff } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { doctorLogin } from "@/lib/api-extended"
import { setAuthToken } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function DoctorLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    email: "",
    password: "",
  })

  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const loginData = { email: form.email, password: form.password }
      const res = await doctorLogin(loginData)

      console.log("Doctor login response:", res);

      if (res.token) {
        setAuthToken(res.token, 'doctor')
        router.push('/doctor/dashboard')
      } else if (res.message) {
        setError(res.message)
      } else {
        setError("Login failed. Please check your credentials.")
      }
    } catch (err: any) {
      // Always show backend error message if available
      if (err?.message) {
        setError(err.message)
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glassmorphism border-0">
          <CardHeader className="text-center pb-2">
            <Link href="/" className="inline-block mb-4">
              <div className="flex items-center justify-center space-x-3">
                <Eye className="w-8 h-8 text-[#2D5A27]" />
                <span className="text-2xl font-bold gradient-text font-poppins">VisionCare AI</span>
              </div>
            </Link>
            <CardTitle className="text-2xl font-bold text-[#2C3E50] font-poppins">
              Doctor Login
            </CardTitle>
            <p className="text-[#2C3E50] opacity-70">
              Access your doctor dashboard
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2C3E50]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2C3E50]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    required
                  />
                  <button
                    type="button"
                    title={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#2C3E50] opacity-50 hover:opacity-70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2D5A27] hover:bg-[#3D7C47] text-white py-3 rounded-full transition-all duration-200 hover:scale-105"
              >
                {loading ? "Signing in..." : "Sign In as Doctor"}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <p className="text-sm text-[#2C3E50] opacity-70">
                Don't have an account?{" "}
                <Link
                  href="/auth/doctor/signup"
                  className="text-[#2D5A27] hover:text-[#3D7C47] font-medium transition-colors duration-200"
                >
                  Register as Doctor
                </Link>
              </p>
              <p className="text-sm text-[#2C3E50] opacity-70">
                Are you a patient?{" "}
                <Link
                  href="/auth/login"
                  className="text-[#2D5A27] hover:text-[#3D7C47] font-medium transition-colors duration-200"
                >
                  Patient Login
                </Link>
              </p>
              <Link href="/" className="inline-flex items-center text-sm text-[#2C3E50] opacity-60 hover:opacity-80 transition-opacity duration-200">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
