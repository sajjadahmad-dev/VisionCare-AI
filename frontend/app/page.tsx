"use client"

import { useState, useEffect } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Eye, Brain, Zap, Shield, ChevronRight, Star, Quote, Menu, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getDoctors, bookAppointment, getAppointments } from "@/lib/api"

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])

  // Particle system
  const [particles, setParticles] = useState<Array<{ id: number; left: string; delay: number; size: number }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 8,
      size: Math.random() * 4 + 2,
    }))
    setParticles(newParticles)
  }, [])

  const features = [
    {
      icon: Eye,
      title: "Real-time Analysis",
      description: "Instant eye image processing with advanced computer vision algorithms",
    },
    {
      icon: Brain,
      title: "AI-Powered Diagnosis",
      description: "Machine learning models trained on thousands of medical cases",
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get comprehensive analysis results in seconds, not hours",
    },
    {
      icon: Shield,
      title: "Medical-Grade Accuracy",
      description: "99.2% accuracy rate validated by ophthalmology professionals",
    },
  ]

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Ophthalmologist",
      content: "EyeCare AI has revolutionized our diagnostic process. The accuracy is remarkable.",
      rating: 5,
    },
    {
      name: "Dr. Michael Rodriguez",
      role: "Eye Specialist",
      content: "This tool has become indispensable in our clinic. Early detection saves lives.",
      rating: 5,
    },
    {
      name: "Dr. Emily Watson",
      role: "Medical Director",
      content: "The speed and precision of EyeCare AI allows us to help more patients effectively.",
      rating: 5,
    },
  ]

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle bg-[#FF6B6B] opacity-20"
            style={{
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        className="fixed top-0 w-full z-50 glassmorphism"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div className="flex items-center space-x-3" whileHover={{ scale: 1.05 }}>
              <div className="relative">
                <Eye className="w-8 h-8 text-[#2D5A27] eye-blink" />
                <div className="absolute inset-0 bg-[#FF6B6B] rounded-full opacity-20 pulse-glow" />
              </div>
              <span className="text-2xl font-bold gradient-text font-poppins">EyeCare AI</span>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-[#2C3E50] hover:text-[#2D5A27] transition-colors duration-200">
                Features
              </a>
              <a href="#testimonials" className="text-[#2C3E50] hover:text-[#2D5A27] transition-colors duration-200">
                Testimonials
              </a>
              <Link href="/chat">
                <Button className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white px-6 py-2 rounded-full transition-all duration-200 hover:scale-105">
                  Start Analysis
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-[#2D5A27]" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <motion.nav
              className="md:hidden mt-4 pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-[#2C3E50] hover:text-[#2D5A27] transition-colors duration-200">
                  Features
                </a>
                <a href="#testimonials" className="text-[#2C3E50] hover:text-[#2D5A27] transition-colors duration-200">
                  Testimonials
                </a>
                <Link href="/chat">
                  <Button className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white px-6 py-2 rounded-full w-full">
                    Start Analysis
                  </Button>
                </Link>
              </div>
            </motion.nav>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <motion.div className="absolute inset-0 opacity-10" style={{ y }}>
          <div className="w-full h-full bg-gradient-to-r from-[#2D5A27] to-[#FF6B6B] rounded-full blur-3xl transform scale-150" />
        </motion.div>

        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-poppins">
              <span className="gradient-text">Advanced Eye</span>
              <br />
              <span className="text-[#2C3E50]">Conjunctiva Disease</span>
              <br />
              <span className="gradient-text">Detection</span>
            </h1>
          </motion.div>

          <motion.p
            className="text-xl md:text-2xl text-[#2C3E50] mb-8 max-w-3xl mx-auto opacity-80"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            AI-Powered Computer Vision for Early Diagnosis
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link href="/chat">
              <Button className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white px-8 py-4 text-lg rounded-full pulse-glow transition-all duration-300 hover:scale-110 group">
                Start Your Analysis
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </Link>
          </motion.div>

          {/* Floating Eye Visualization */}
          <motion.div
            className="absolute right-10 top-1/2 transform -translate-y-1/2 hidden lg:block"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <div className="w-32 h-32 rounded-full glassmorphism flex items-center justify-center">
              <Eye className="w-16 h-16 text-[#2D5A27]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text font-poppins">Revolutionary Features</h2>
            <p className="text-xl text-[#2C3E50] opacity-80 max-w-2xl mx-auto">
              Cutting-edge technology meets medical expertise for unparalleled diagnostic accuracy
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <Card className="glassmorphism border-0 h-full hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="mb-6 relative">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#2D5A27] to-[#3D7C47] rounded-full flex items-center justify-center floating-animation">
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-[#2C3E50] font-poppins">{feature.title}</h3>
                    <p className="text-[#2C3E50] opacity-80">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Eye Anatomy */}
      <section className="py-20 bg-gradient-to-r from-[#2D5A27]/5 to-[#FF6B6B]/5">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text font-poppins">Advanced Eye Analysis</h2>
            <p className="text-xl text-[#2C3E50] opacity-80 max-w-2xl mx-auto">
              Our AI examines multiple aspects of eye health with precision
            </p>
          </motion.div>

          <div className="flex justify-center">
            <motion.div
              className="relative w-80 h-80 glassmorphism rounded-full flex items-center justify-center group cursor-pointer"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
            >
              <Eye className="w-32 h-32 text-[#2D5A27] group-hover:text-[#FF6B6B] transition-colors duration-300" />

              {/* Hover Points */}
              <motion.div
                className="absolute top-20 left-20 w-4 h-4 bg-[#FFD93D] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                whileHover={{ scale: 1.5 }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-[#2C3E50] text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  Conjunctiva
                </div>
              </motion.div>

              <motion.div
                className="absolute top-32 right-20 w-4 h-4 bg-[#FF6B6B] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                whileHover={{ scale: 1.5 }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-[#2C3E50] text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  Sclera
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text font-poppins">
              Trusted by Medical Professionals
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="glassmorphism border-0 h-full">
                  <CardContent className="p-8">
                    <Quote className="w-8 h-8 text-[#FF6B6B] mb-4" />
                    <p className="text-[#2C3E50] mb-6 italic">"{testimonial.content}"</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-[#2C3E50] font-poppins">{testimonial.name}</h4>
                        <p className="text-[#2C3E50] opacity-70 text-sm">{testimonial.role}</p>
                      </div>
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-[#FFD93D] fill-current" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctor & Appointment Section */}
      <section className="py-20 bg-gradient-to-r from-[#2D5A27]/10 to-[#FF6B6B]/10">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text font-poppins">Book an Appointment</h2>
            <p className="text-xl text-[#2C3E50] opacity-80 max-w-2xl mx-auto">
              Connect with our top eye specialists for a professional consultation.
            </p>
          </motion.div>
          <DoctorAppointmentSection />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D5A27] text-white py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Eye className="w-8 h-8" />
              <span className="text-2xl font-bold font-poppins">EyeCare AI</span>
            </div>
            <p className="text-white/80 mb-6 max-w-2xl mx-auto">
              EyeCare AI is a diagnostic aid and should not replace professional medical consultation. Always consult
              with a qualified healthcare provider for medical advice.
            </p>
            <div className="border-t border-white/20 pt-6">
              <p className="text-white/60 text-sm">
                © 2024 EyeCare AI. All rights reserved. | Medical Device Registration Pending
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// DoctorAppointmentSection component
function DoctorAppointmentSection() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [form, setForm] = useState({
    patient_name: "",
    contact_number: "",
    preferred_date: "",
    preferred_time: "",
    concern: "",
  })
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)
  const [bookingStatus, setBookingStatus] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [doctorError, setDoctorError] = useState<string | null>(null)

  useEffect(() => {
    getDoctors()
      .then((res) => {
        setDoctors(res.doctors || [])
        setLoadingDoctors(false)
      })
      .catch(() => setLoadingDoctors(false))
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingStatus(null)
    setDoctorError(null)
    console.log("Form submit, selectedDoctor:", selectedDoctor, "type:", typeof selectedDoctor)
    if (!selectedDoctor) {
      setDoctorError("Please select a doctor before booking an appointment.")
      return
    }
    try {
      const data = {
        ...form,
        doctor_id: selectedDoctor,
      }
      console.log("Booking appointment with data:", data)
      const res = await bookAppointment(data)
      setBookingStatus("Appointment booked successfully!")
      setForm({
        patient_name: "",
        contact_number: "",
        preferred_date: "",
        preferred_time: "",
        concern: "",
      })
      setSelectedDoctor(null)
      // Refresh appointments
      fetchAppointments()
    } catch (err) {
      setBookingStatus("Failed to book appointment. Please try again.")
    }
  }

  const fetchAppointments = () => {
    setLoadingAppointments(true)
    getAppointments()
      .then((res) => {
        console.log("Fetched appointments:", res.appointments)
        setAppointments(res.appointments || [])
        setLoadingAppointments(false)
      })
      .catch(() => setLoadingAppointments(false))
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-12">
      {/* Doctor List */}
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-[#2C3E50] font-poppins">Available Doctors</h3>
        {loadingDoctors ? (
          <p>Loading doctors...</p>
        ) : (
          <div className="space-y-4">
            {doctors.map((doc: any) => (
              <Card
                key={doc.id}
                className={`glassmorphism border-0 p-4 cursor-pointer ${
                  selectedDoctor === doc.id ? "ring-2 ring-[#2D5A27]" : ""
                }`}
                onClick={() => {
                  const docIdNum = typeof doc.id === "string" ? parseInt(doc.id, 10) : doc.id
                  console.log("Doctor card clicked, doc.id:", doc.id, "type:", typeof doc.id, "parsed:", docIdNum)
                  setSelectedDoctor(docIdNum)
                }}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-[#2C3E50]">{doc.name}</h4>
                      <p className="text-[#2C3E50] opacity-70 text-sm">{doc.specialty}</p>
                      <p className="text-[#2C3E50] opacity-60 text-xs">Experience: {doc.experience}</p>
                      <div className="flex">
                        {[...Array(Math.round(doc.rating))].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-[#FFD93D] fill-current" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-[#2D5A27] font-semibold">Slots:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.available_slots.map((slot: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-1 rounded text-xs"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Appointment Form & List */}
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-[#2C3E50] font-poppins">Book Appointment</h3>
        <form className="space-y-4" onSubmit={handleBook}>
          <input
            type="text"
            name="patient_name"
            value={form.patient_name}
            onChange={handleInputChange}
            placeholder="Your Name"
            className="w-full px-4 py-2 rounded border border-[#2D5A27]/20"
            required
          />
          <input
            type="text"
            name="contact_number"
            value={form.contact_number}
            onChange={handleInputChange}
            placeholder="Contact Number"
            className="w-full px-4 py-2 rounded border border-[#2D5A27]/20"
            required
          />
          <input
            type="date"
            name="preferred_date"
            value={form.preferred_date}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded border border-[#2D5A27]/20"
            required
          />
          <input
            type="time"
            name="preferred_time"
            value={form.preferred_time}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded border border-[#2D5A27]/20"
            required
          />
          <textarea
            name="concern"
            value={form.concern}
            onChange={handleInputChange}
            placeholder="Describe your concern (optional)"
            className="w-full px-4 py-2 rounded border border-[#2D5A27]/20"
            rows={2}
          />
          <Button
            type="submit"
            className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white px-6 py-2 rounded-full"
            disabled={!selectedDoctor}
          >
            Book Appointment
          </Button>
          {doctorError && <p className="text-sm mt-2 text-red-600">{doctorError}</p>}
          {bookingStatus && <p className="text-sm mt-2">{bookingStatus}</p>}
        </form>
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-2 text-[#2C3E50]">Your Appointments</h4>
          <Button
            size="sm"
            variant="outline"
            className="mb-2"
            onClick={fetchAppointments}
            disabled={loadingAppointments}
          >
            {loadingAppointments ? "Refreshing..." : "Refresh"}
          </Button>
          <div className="space-y-2">
            {appointments.length === 0 ? (
              <p className="text-sm text-[#2C3E50] opacity-60">No appointments found.</p>
            ) : (
              appointments.map((appt: any) => (
                <Card key={appt.appointment_id} className="glassmorphism border-0 p-3">
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{appt.patient_name}</p>
                        <p className="text-xs text-[#2C3E50] opacity-70">
                          {appt.preferred_date} at {appt.preferred_time}
                        </p>
                        <p className="text-xs text-[#2C3E50] opacity-60">
                          Doctor: {appt.doctor?.name || "Assigned"}
                        </p>
                        <p className="text-xs text-[#2C3E50] opacity-60">
                          Status: {appt.status}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#2D5A27]">{appt.created_at?.slice(0, 10)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
