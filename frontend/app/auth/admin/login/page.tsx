"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminLogin } from "@/lib/api-extended";
import { setAuthToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await adminLogin(password);
      if (res.token) {
        // Store token as "admin_token" for dashboard compatibility
        localStorage.setItem("admin_token", res.token);
        setAuthToken(res.token, "admin");
        router.push("/admin/dashboard");
      } else {
        setError("Invalid password.");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#E8F5E8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glassmorphism border-0">
          <CardHeader className="text-center">
            <motion.div
              className="flex items-center justify-center space-x-3 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <Eye className="w-8 h-8 text-[#2D5A27]" />
                <div className="absolute inset-0 bg-[#2D5A27] rounded-full opacity-20 pulse-glow" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#2C3E50] font-poppins">
                Admin Login
              </CardTitle>
            </motion.div>
            <p className="text-[#2C3E50] opacity-80">
              Access the administration panel
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-[#2C3E50]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-[#2C3E50] opacity-50" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 border-[#2C3E50]/20 focus:border-[#2D5A27]"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#2D5A27] hover:bg-[#3D7C47] text-white py-3 rounded-full transition-all duration-300 hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login as Admin"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-[#2D5A27] hover:text-[#3D7C47] transition-colors duration-200">
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
