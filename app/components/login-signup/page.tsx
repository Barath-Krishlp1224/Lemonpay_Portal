"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Building2 } from "lucide-react";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type Role = "Admin" | "Manager" | "TeamLead" | "Employee";
type Team =
  | "Founders"
  | "Manager"
  | "TL-Reporting Manager"
  | "IT Admin"
  | "Tech"
  | "Accounts"
  | "HR"
  | "Admin & Operations"
  | "TL Accountant";

export default function App() {
  const [form, setForm] = useState<{ empId: string; password: string }>({
    empId: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [typingComplete, setTypingComplete] = useState(false);
  const router = useRouter();

  // Typing text effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setTypingComplete(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Toast helpers
  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const showValidationError = (message: string) => {
    showToast(message, "error");
  };

  // Auth submit
  const handleSubmit = async () => {
    if (!form.empId) {
      showValidationError("Employee ID or Email is required.");
      return;
    }

    if (!form.password) {
      showValidationError("Password is required.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empIdOrEmail: form.empId,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage =
          data?.error || "Login failed. Please check your credentials.";
        showToast(errorMessage, "error");
        return;
      }

      showToast(data.message || "Login successful!", "success");

      setTimeout(() => {
        if (!data.user?.role || !data.user?.empId) {
          showToast(
            "Login successful but required user data is missing.",
            "error"
          );
          return;
        }

        const userRole = data.user.role as Role;
        const userTeam = data.user.team as Team | undefined;

        if (typeof window !== "undefined") {
          localStorage.setItem("userRole", userRole);
          localStorage.setItem("userEmpId", data.user.empId);
          if (data.user.name) localStorage.setItem("userName", data.user.name);
          if (userTeam) localStorage.setItem("userTeam", userTeam);
        }

        if (userRole === "Admin") {
          router.push("/components/admin");
        } else if (userRole === "Manager") {
          router.push("/components/manager");
        } else if (userRole === "TeamLead") {
          router.push("/components/team-lead");
        } else {
          switch (userTeam) {
            case "HR":
              router.push("/components/hr");
              break;
            case "Accounts":
              router.push("/components/employee");
              break;
            case "TL Accountant":
              router.push("/components/tl-accountant");
              break;
            case "Admin & Operations":
              router.push("/components/employee");
              break;
            case "Tech":
              router.push("/components/employee");
              break;
            case "IT Admin":
              router.push("/components/it-admin");
              break;
            case "Founders":
              router.push("/components/founders");
              break;
            case "Manager":
              router.push("/components/manager");
              break;
            case "TL-Reporting Manager":
              router.push("/components/team-lead");
              break;
            default:
              router.push("/components/home");
          }
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast("Network error. Try again later.", "error");
    }
  };

  const handleForgotClick = () => {
    router.push("/components/forgot-password");
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap");

        @keyframes slideUp {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideInRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes typing {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        @keyframes blink {
          50% {
            border-color: transparent;
          }
        }

        .animate-slide-up {
          animation: slideUp 0.8s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }

        .typing-text {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          border-right: 3px solid rgba(96, 165, 250, 0.7);
          animation: typing 3s steps(20, end) 0.5s forwards,
            blink 0.75s step-end infinite;
          width: 0;
        }
        .typing-text-complete {
          border-right: none;
          animation: none;
          width: 100%;
        }

        .font-poppins {
          font-family: "Poppins", sans-serif;
        }
        .font-inter {
          font-family: "Inter", sans-serif;
        }
        .font-playfair {
          font-family: "Playfair Display", serif;
        }
        .font-space {
          font-family: "Space Grotesk", sans-serif;
        }
        .font-montserrat {
          font-family: "Montserrat", sans-serif;
        }
      `}</style>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in-right px-6 py-4 rounded-lg shadow-xl font-inter text-sm ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* LEFT PANEL – updated to match ForgotPassword right box style */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 p-12 flex-col relative overflow-hidden rounded-br-full">
        {/* Background pattern + video */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0 bg-repeat"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full rounded-br-full object-cover"
          >
            <source src="/2 copy.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Dark overlay */}
        <div
          className="absolute inset-0 rounded-br-full bg-slate-900/40"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex-grow flex flex-col justify-center items-start">
            {/* Logo */}
            <div className="flex-shrink-0 mb-12 animate-slide-up">
              <div className="rounded-2xl p-4 inline-block">
                <img
                  src="/logo hd.png"
                  alt="Company logo"
                  className="w-100 h-30 object-contain"
                />
              </div>
            </div>

            {/* Heading + text */}
            <div className="max-w-md w-full animate-slide-up">
              <h1 className="text-5xl font-bold text-white mb-6 leading-tight font-montserrat">
                Welcome to
                <br />
                <span
                  className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-space ${
                    typingComplete ? "typing-text-complete" : "typing-text"
                  }`}
                >
                  Lemonpay Workspace...
                </span>
              </h1>
              <p className="text-white text-lg leading-relaxed mb-12 max-w-md font-inter opacity-90">
                Sign in to access your personalized workspace, manage approvals,
                track tasks, and collaborate securely across your teams.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Login form (unchanged) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile icon */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-blue-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 font-poppins">
              Sign In
            </h1>
            <p className="text-gray-600 font-inter">
              Enter your credentials to access your account
            </p>
          </div>

          <div className="space-y-5">
            {/* Employee ID / Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                Employee ID / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="EMP001 or email@company.com"
                  value={form.empId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, empId: e.target.value }))
                  }
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-inter"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-montserrat">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-inter"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleForgotClick}
                className="text-sm text-black font-medium transition-colors font-space"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 font-poppins"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
