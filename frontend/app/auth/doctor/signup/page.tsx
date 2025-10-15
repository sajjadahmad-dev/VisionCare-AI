"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, ArrowLeft, Mail, Lock, EyeOff, User, Phone, Stethoscope, Award, FileText, Upload, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { doctorSignup } from "@/lib/api-extended"
import { setAuthToken } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function DoctorSignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    specialty: "",
    experience_years: "",
    license_number: "",
    phone: "",
    bio: "",
  })
  // Availability: array of { day: string, start: string, end: string }
  const [availability, setAvailability] = useState<{ day: string; start: string; end: string }[]>([])
  const [newAvailDay, setNewAvailDay] = useState("")
  const [newAvailStart, setNewAvailStart] = useState("")
  const [newAvailEnd, setNewAvailEnd] = useState("")
  const [files, setFiles] = useState({
    cnic_front: null as File | null,
    cnic_back: null as File | null,
    doctor_certificate: null as File | null,
  })

  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof files) => {
    const file = e.target.files?.[0] || null
    setFiles({ ...files, [field]: file })
  }

  const removeFile = (field: keyof typeof files) => {
    setFiles({ ...files, [field]: null })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validate required files
    if (!files.cnic_front || !files.cnic_back || !files.doctor_certificate) {
      setError("Please upload all required documents: CNIC front, CNIC back, and doctor certificate.")
      setLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('email', form.email)
      formData.append('password', form.password)
      formData.append('full_name', form.full_name)
      formData.append('specialty', form.specialty)
      formData.append('experience_years', form.experience_years)
      formData.append('license_number', form.license_number)
      if (form.phone) formData.append('phone', form.phone)
      if (form.bio) formData.append('bio', form.bio)
      // Add availability as JSON string
      formData.append('availability', JSON.stringify(availability))

      formData.append('cnic_front', files.cnic_front)
      formData.append('cnic_back', files.cnic_back)
      formData.append('doctor_certificate', files.doctor_certificate)

      const res = await doctorSignup(formData)

      if (res.token) {
        setAuthToken(res.token, 'doctor')
        alert("Account created successfully! Your documents are under review. You will receive an email once approved.")
        router.push('/')
      } else {
        setError("Signup failed. Please try again.")
      }
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.")
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
        className="w-full max-w-2xl"
      >
        <Card className="glassmorphism border-0">
          <CardHeader className="text-center pb-2">
            <Link href="/" className="inline-block mb-4">
              <div className="flex items-center justify-center space-x-3">
                <Eye className="w-8 h-8 text-[#2D5A27]" />
                <span className="text-2xl font-bold gradient-text font-poppins">EyeCare AI</span>
              </div>
            </Link>
            <CardTitle className="text-2xl font-bold text-[#2C3E50] font-poppins">
              Join as a Doctor
            </CardTitle>
            <p className="text-[#2C3E50] opacity-70">
              Register to provide expert eye care services
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2C3E50]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                    <Input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleInputChange}
                      placeholder="Dr. Full Name"
                      className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2C3E50]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                    <Input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      placeholder="doctor@example.com"
                      className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2C3E50]">Specialty</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                    <Input
                      type="text"
                      name="specialty"
                      value={form.specialty}
                      onChange={handleInputChange}
                      placeholder="e.g., Ophthalmologist"
                      className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2C3E50]">Experience (Years)</label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                    <Input
                      type="number"
                      name="experience_years"
                      value={form.experience_years}
                      onChange={handleInputChange}
                      placeholder="5"
                      min="0"
                      className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2C3E50]">License Number</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                    <Input
                      type="text"
                      name="license_number"
                      value={form.license_number}
                      onChange={handleInputChange}
                      placeholder="Medical License #"
                      className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2C3E50]">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2C3E50] opacity-50" />
                    <Input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    />
                  </div>
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
                    placeholder="Create a secure password"
                    className="pl-10 pr-10 bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#2C3E50] opacity-50 hover:opacity-70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2C3E50]">Bio (Optional)</label>
                <Textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleInputChange}
                  placeholder="Tell patients about your experience and approach to eye care..."
                  className="bg-white/50 border-white/30 focus:border-[#2D5A27] min-h-[80px]"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2C3E50]">Availability (Time Ranges)</h3>
                <p className="text-sm text-[#2C3E50] opacity-70">
                  Add your available days and time ranges for appointments (e.g., Monday 09:00 to 14:00).
                </p>
                <div className="mb-4 flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0">
                  <div>
                    <label className="text-xs font-medium text-[#2C3E50]">Day</label>
                    <select
                      value={newAvailDay}
                      onChange={e => setNewAvailDay(e.target.value)}
                      className="w-full p-2 border rounded bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    >
                      <option value="">Select day</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#2C3E50]">Start Time</label>
                    <Input
                      type="time"
                      value={newAvailStart}
                      onChange={e => setNewAvailStart(e.target.value)}
                      className="bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#2C3E50]">End Time</label>
                    <Input
                      type="time"
                      value={newAvailEnd}
                      onChange={e => setNewAvailEnd(e.target.value)}
                      className="bg-white/50 border-white/30 focus:border-[#2D5A27]"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#2D5A27] text-white mt-2 md:mt-0"
                    onClick={() => {
                      if (
                        newAvailDay &&
                        newAvailStart &&
                        newAvailEnd &&
                        newAvailStart < newAvailEnd
                      ) {
                        setAvailability([...availability, { day: newAvailDay, start: newAvailStart, end: newAvailEnd }])
                        setNewAvailDay("")
                        setNewAvailStart("")
                        setNewAvailEnd("")
                      }
                    }}
                  >
                    Add Day & Time Range
                  </Button>
                </div>
                {/* Show all added availabilities */}
                {availability.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-[#2C3E50]">Your Availability:</span>
                    <ul className="mt-1 space-y-1">
                      {availability.map((a, idx) => (
                        <li key={a.day + a.start + a.end} className="flex items-center space-x-2">
                          <span className="font-medium">{a.day}:</span>
                          <span>
                            {a.start} to {a.end}
                          </span>
                          <button
                            type="button"
                            className="ml-2 text-red-500"
                            onClick={() => setAvailability(availability.filter((_, i) => i !== idx))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-[#2C3E50]">Required Documents</h3>
                <p className="text-sm text-[#2C3E50] opacity-70">
                  Please upload the following documents for verification:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2C3E50]">CNIC Front</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'cnic_front')}
                        className="hidden"
                        id="cnic_front"
                      />
                      <label
                        htmlFor="cnic_front"
                        className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[#2D5A27] rounded-lg cursor-pointer hover:bg-[#2D5A27]/10 transition-colors"
                      >
                        {files.cnic_front ? (
                          <div className="flex items-center space-x-2">
                            <FileText className="w-6 h-6 text-[#2D5A27]" />
                            <span className="text-sm text-[#2C3E50]">{files.cnic_front.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                removeFile('cnic_front');
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-1">
                            <Upload className="w-6 h-6 text-[#2D5A27]" />
                            <span className="text-xs text-[#2C3E50]">Upload CNIC Front</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2C3E50]">CNIC Back</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'cnic_back')}
                        className="hidden"
                        id="cnic_back"
                      />
                      <label
                        htmlFor="cnic_back"
                        className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[#2D5A27] rounded-lg cursor-pointer hover:bg-[#2D5A27]/10 transition-colors"
                      >
                        {files.cnic_back ? (
                          <div className="flex items-center space-x-2">
                            <FileText className="w-6 h-6 text-[#2D5A27]" />
                            <span className="text-sm text-[#2C3E50]">{files.cnic_back.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                removeFile('cnic_back');
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-1">
                            <Upload className="w-6 h-6 text-[#2D5A27]" />
                            <span className="text-xs text-[#2C3E50]">Upload CNIC Back</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#2C3E50]">Doctor Certificate</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, 'doctor_certificate')}
                        className="hidden"
                        id="doctor_certificate"
                      />
                      <label
                        htmlFor="doctor_certificate"
                        className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[#2D5A27] rounded-lg cursor-pointer hover:bg-[#2D5A27]/10 transition-colors"
                      >
                        {files.doctor_certificate ? (
                          <div className="flex items-center space-x-2">
                            <FileText className="w-6 h-6 text-[#2D5A27]" />
                            <span className="text-sm text-[#2C3E50]">{files.doctor_certificate.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                removeFile('doctor_certificate');
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-1">
                            <Upload className="w-6 h-6 text-[#2D5A27]" />
                            <span className="text-xs text-[#2C3E50]">Upload Certificate</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
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
                {loading ? "Creating Account..." : "Submit Application"}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <p className="text-sm text-[#2C3E50] opacity-70">
                Already have an account?{" "}
                <Link
                  href="/auth/doctor/login"
                  className="text-[#2D5A27] hover:text-[#3D7C47] font-medium transition-colors duration-200"
                >
                  Sign in as Doctor
                </Link>
              </p>
              <p className="text-sm text-[#2C3E50] opacity-70">
                Are you a patient?{" "}
                <Link
                  href="/auth/signup"
                  className="text-[#2D5A27] hover:text-[#3D7C47] font-medium transition-colors duration-200"
                >
                  Sign up as Patient
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
