"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Eye, ArrowLeft, MessageCircle, ImageIcon, CheckCircle, AlertTriangle, Info, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { askQuestion, analyzeImage, getDetectionResultUrl } from "@/lib/api"
import { getUserType } from "@/lib/auth"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  image?: string
  timestamp: Date
  timeString?: string
  analysis?: {
    condition: string
    confidence: number
    severity: "low" | "medium" | "high"
    recommendations: string[]
  }
}

function formatMarkdownToHtml(markdown: string): string {
  if (!markdown) return ""
  let html = markdown

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>")

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>")
  html = html.replace(/_(.*?)_/g, "<em>$1</em>")

  // Unordered lists (- item or * item)
  html = html.replace(/(?:^|\n)[\-\*] (.*?)(?=\n|$)/g, "<li>$1</li>")
  html = html.replace(/(<li>[\s\S]*<\/li>)/g, "<ul>$1</ul>")

  // Ordered lists (1. item)
  html = html.replace(/(?:^|\n)\d+\. (.*?)(?=\n|$)/g, "<li>$1</li>")
  html = html.replace(/(<li>[\s\S]*<\/li>)/g, "<ol>$1</ol>")

  // Paragraphs (split by double newlines)
  html = html.replace(/\n{2,}/g, "</p><p>")
  html = "<p>" + html + "</p>"
  html = html.replace(/<p><\/p>/g, "") // Remove empty paragraphs

  // Line breaks
  html = html.replace(/\n/g, "<br />")

  return html
}

export default function ChatPage() {
  // Hydration-safe dashboard link
  const [dashboardHref, setDashboardHref] = useState("/");

  useEffect(() => {
    const userType = getUserType();
    if (userType === "doctor") setDashboardHref("/doctor/dashboard");
    else if (userType === "user") setDashboardHref("/dashboard");
    else setDashboardHref("/");
  }, []);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI eye health assistant. Please upload a clear image of your eye for analysis, or ask me any questions about eye health.",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Booking intent detection and flow
  const [bookingStep, setBookingStep] = useState<null | "doctor" | "date" | "time" | "confirm">(null)
  const [bookingDoctor, setBookingDoctor] = useState<any>(null)
  const [bookingDate, setBookingDate] = useState("")
  const [bookingTime, setBookingTime] = useState("")
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return

    // Booking intent detection (simple keyword match)
    if (
      /book.*appointment|appointment.*book|see.*doctor|doctor.*see|visit.*doctor|doctor.*visit/i.test(
        inputMessage
      )
    ) {
      setBookingStep("doctor")
      setInputMessage("")
      setIsTyping(false)
      // Fetch doctors
      try {
        const res = await fetch("/api/doctors")
        const data = await res.json()
        setAvailableDoctors(data.doctors || [])
      } catch {
        setAvailableDoctors([])
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "ai",
          content: "Let's book an appointment! Please select a doctor from the list below.",
          timestamp: new Date(),
        },
      ])
      return
    }

    const now = new Date();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage || "Image uploaded for analysis",
      image: selectedImage || undefined,
      timestamp: now,
      timeString: now.toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setSelectedImage(null)
    setIsTyping(true)

    try {
      let aiResponse: Message

      if (selectedImage) {
        // Convert base64 image to File object
        const base64Data = selectedImage.split(",")[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const file = new File([byteArray], "eye.jpg", { type: "image/jpeg" })

        // Call backend for image analysis
        const res = await analyzeImage(file)
        const yolo = res.yolo_detection?.detections?.[0]
        const gpt = res.gpt_analysis || {}

        // Get output image URL from yolo_detection.detection_path if present, else from file_id
        let outputImageUrl: string | undefined = undefined
        if (res.yolo_detection && res.yolo_detection.detection_path) {
          // Remove any leading "/backend/" from detection_path
          let cleanPath = res.yolo_detection.detection_path.replace(/^\/?backend\//, "");
          outputImageUrl = cleanPath.startsWith("http")
            ? cleanPath
            : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/${cleanPath.replace(/^\/+/, "")}`;
        } else if (res.file_id) {
          outputImageUrl = getDetectionResultUrl(res.file_id)
        }

        // Compose a detailed message with YOLO and GPT results
        let detectionText = "";
        if (yolo) {
          detectionText += `<strong>YOLO Detection:</strong> ${yolo.class || "Unknown"}<br/>Confidence: ${
            yolo.confidence ? Math.round(yolo.confidence * 100) : 0
          }%<br/>`;
        }
        if (gpt.analysis) {
          detectionText += `<strong>AI Analysis:</strong> ${gpt.analysis}<br/>`;
        }
        if (gpt.recommendations) {
          detectionText += `<strong>Recommendations:</strong> ${gpt.recommendations}`;
        }

        const aiNow = new Date();
        aiResponse = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: detectionText || "Image analysis complete.",
          timestamp: aiNow,
          timeString: aiNow.toLocaleTimeString(),
          image: outputImageUrl,
          analysis: yolo
            ? {
                condition: yolo.class || "Unknown",
                confidence: yolo.confidence ? Math.round(yolo.confidence * 100) : 0,
                severity: "low", // Could be improved with more logic
                recommendations: gpt.recommendations
                  ? [gpt.recommendations]
                  : ["Maintain good eye hygiene."],
              }
            : undefined,
        }
      } else {
        // Call backend for text Q&A
        const res = await askQuestion(inputMessage)
        const aiNow = new Date();
        aiResponse = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: res.answer || "Sorry, I couldn't process your question.",
          timestamp: aiNow,
          timeString: aiNow.toLocaleTimeString(),
        }
      }

      setMessages((prev) => [...prev, aiResponse])
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          type: "ai",
          content: "Sorry, there was an error connecting to the backend.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "low":
        return CheckCircle
      case "medium":
        return AlertTriangle
      case "high":
        return AlertTriangle
      default:
        return Info
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex">
      {/* Sidebar */}
      <motion.div
        className="w-80 bg-white/30 backdrop-blur-lg border-r border-white/20 p-6 hidden lg:block"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-8">
          <Link href={dashboardHref}>
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Eye className="w-6 h-6 text-[#2D5A27]" />
          <span className="text-lg font-semibold gradient-text font-poppins">EyeCare AI</span>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[#2C3E50] opacity-70 uppercase tracking-wide">
            Conversation History
          </h3>

          <Card className="glassmorphism border-0 cursor-pointer hover:bg-white/40 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-4 h-4 text-[#2D5A27]" />
                <div>
                  <p className="text-sm font-medium text-[#2C3E50]">Current Session</p>
                  <p className="text-xs text-[#2C3E50] opacity-60">{messages.length} messages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 bg-[#2D5A27]/10 rounded-lg">
            <h4 className="text-sm font-medium text-[#2D5A27] mb-2">Quick Tips</h4>
            <ul className="text-xs text-[#2C3E50] opacity-80 space-y-1">
              <li>• Upload clear, well-lit eye images</li>
              <li>• Avoid flash photography</li>
              <li>• Include both eyes if possible</li>
              <li>• Describe any symptoms you're experiencing</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.header
          className="bg-white/30 backdrop-blur-lg border-b border-white/20 p-4"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href={dashboardHref} className="lg:hidden">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-[#2C3E50] font-poppins">AI Eye Analysis</h1>
                <p className="text-sm text-[#2C3E50] opacity-60">Upload an image or ask questions about eye health</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-[#2C3E50] opacity-60">Online</span>
            </div>
          </div>
        </motion.header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-2xl ${message.type === "user" ? "order-2" : "order-1"}`}>
                  <div
                    className={`p-4 rounded-2xl ${
                      message.type === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-ai"
                    }`}
                  >
                    {/* Show YOLO detection image with label */}
                    {message.image && (
                      <div className="mb-3 text-center">
                        <div className="font-semibold text-[#2D5A27] mb-1">YOLO Detection Output</div>
                        <img
                          src={message.image || "/placeholder.svg"}
                          alt="YOLO detection result"
                          className="rounded-lg max-w-xs w-full h-auto border-2 border-[#2D5A27]"
                        />
                      </div>
                    )}
                    {message.type === "ai" ? (
                      <div>
                        {/* If the message is an AI analysis, try to parse and render as a card */}
                        {(() => {
  // Try to parse JSON from message.content if present (even if in a code block or prefixed)
  let analysisObj: any = null;
  let content = message.content.trim();

  // 1. If content contains a code block with json, extract it
  const codeBlockMatch = content.match(/```json([\s\S]*?)```/);
  if (codeBlockMatch) {
    content = codeBlockMatch[1].trim();
  } else {
    // 2. If content contains a JSON object anywhere, extract it
    const jsonMatch = content.match(/{[\s\S]*}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
  }

  try {
    if (content.startsWith("{")) {
      analysisObj = JSON.parse(content);
    }
  } catch {}

  if (analysisObj && analysisObj.condition) {
    return (
      <div className="bg-white/80 rounded-lg p-4 shadow border mb-2 max-w-lg">
        <div className="mb-4">
          <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Analysis</span>
          <div className="text-base text-[#2C3E50] font-medium">{analysisObj.analysis}</div>
        </div>
        <div className="mb-4">
          <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Recommendations</span>
          <div className="text-base text-[#2D5A27]">{analysisObj.recommendations}</div>
        </div>
        <div className="mb-4">
          <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Medical Advice</span>
          <div className="text-base text-[#2C3E50]">{analysisObj.medical_advice}</div>
        </div>
        <div>
          <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Risk Level</span>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            analysisObj.risk_level === "low"
              ? "bg-green-100 text-green-800"
              : analysisObj.risk_level === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}>
            {analysisObj.risk_level}
          </span>
        </div>
      </div>
    );
  }
                          // Otherwise, render as HTML
                          return (
                            <div
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(message.content) }}
                            />
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}

                    {message.analysis && (
                      <motion.div
                        className="mt-4 p-4 bg-white/50 rounded-lg"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center space-x-2 mb-3">
                          {(() => {
                            const Icon = getSeverityIcon(message.analysis.severity)
                            return <Icon className={`w-5 h-5 ${getSeverityColor(message.analysis.severity)}`} />
                          })()}
                          <h4 className="font-semibold text-[#2C3E50]">{message.analysis.condition}</h4>
                          <span className={`text-sm font-medium ${getSeverityColor(message.analysis.severity)}`}>
                            {message.analysis.confidence}% confidence
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-[#2C3E50] opacity-60 mb-1">
                            <span>Confidence Level</span>
                            <span>{message.analysis.confidence}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="bg-gradient-to-r from-[#2D5A27] to-[#3D7C47] h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${message.analysis.confidence}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-[#2C3E50] mb-2">Recommendations:</h5>
                          <ul className="space-y-1">
                            {message.analysis.recommendations.map((rec, index) => (
                              <motion.li
                                key={index}
                                className="text-sm text-[#2C3E50] opacity-80 flex items-start space-x-2"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + index * 0.1 }}
                              >
                                <span className="text-[#2D5A27] mt-1">•</span>
                                <span>{rec}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-[#2C3E50] opacity-50 mt-1 px-4">
                    {message.timeString}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="chat-bubble-ai p-4 rounded-2xl max-w-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#2D5A27] rounded-full typing-indicator"></div>
                  <div
                    className="w-2 h-2 bg-[#2D5A27] rounded-full typing-indicator"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-[#2D5A27] rounded-full typing-indicator"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <motion.div
          className="border-t border-white/20 bg-white/30 backdrop-blur-lg p-4"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {selectedImage && (
            <motion.div
              className="mb-4 p-3 bg-white/50 rounded-lg flex items-center space-x-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="Selected"
                className="w-12 h-12 rounded object-cover"
              />
              <span className="text-sm text-[#2C3E50]">Image ready for analysis</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                Remove
              </Button>
            </motion.div>
          )}

          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about eye health or upload an image..."
                className="bg-white/50 border-white/30 focus:border-[#2D5A27] rounded-full px-4 py-3"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
            </div>

            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-full hover:bg-white/50"
            >
              <ImageIcon className="w-5 h-5 text-[#2D5A27]" />
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() && !selectedImage}
              className="bg-[#2D5A27] hover:bg-[#3D7C47] text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>

          <p className="text-xs text-[#2C3E50] opacity-50 mt-2 text-center">
            This AI assistant provides preliminary analysis only. Always consult a healthcare professional for medical
            advice.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
