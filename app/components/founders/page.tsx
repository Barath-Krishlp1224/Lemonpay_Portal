"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckSquare, TrendingUp, Clock, FileText, Calendar } from "lucide-react";
import AttendanceRecords from "../attendance/currentday-view/page";

export default function AdminPage() {
  const router = useRouter();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const goToEmployeeList = () => router.push("/components/founders/view-emp");
  const goToBillsPage = () => router.push("/components/founders/bills");
  const goToExpensesPage = () => router.push("/components/founders/expenses");
  const goToLeavesPage = () => router.push("/components/founders/leaves");
  const goToAttendancePage = () => router.push("/components/attendance/allday");

  const actionCards = [
    {
      id: "view",
      title: "Employee Directory",
      icon: Users,
      onClick: goToEmployeeList,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      id: "tasks",
      title: "Tasks & Performance",
      icon: CheckSquare,
      onClick: () => router.push("/components/all-tasks/task-view"),
      gradient: "from-purple-500 to-purple-600",
    },
    {
      id: "attendance",
      title: "Attendance",
      icon: Clock,
      onClick: goToAttendancePage,
      gradient: "from-green-500 to-green-600",
    },
    {
      id: "bills",
      title: "Bills",
      icon: FileText,
      onClick: goToBillsPage,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      id: "expenses",
      title: "Expenses",
      icon: TrendingUp,
      onClick: goToExpensesPage,
      gradient: "from-red-500 to-red-600",
    },
    {
      id: "leaves",
      title: "Leave Requests",
      icon: Calendar,
      onClick: goToLeavesPage,
      gradient: "from-indigo-500 to-indigo-600",
    }
  ].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
      <div className="w-full py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div
          className={`mb-6 sm:mb-8 md:mb-12 transition-all duration-1000 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
          }`}
        >
          <div className="text-center space-y-2 sm:space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Founder's Dashboard
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Manage your organization with powerful tools and real-time insights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-6"> 
            <div
              className={`transition-all duration-1000 delay-200 ${
                loaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
              }`}
            >
              <div className="mb-4 sm:mb-6">
                <div className="inline-flex items-center gap-2 sm:gap-3 bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    Quick Actions
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                {actionCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      role="button"
                      onClick={card.onClick}
                      className={`group relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 
                        border border-gray-100 cursor-pointer overflow-hidden
                        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                        ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                        ${hoveredButton === card.id ? "scale-[1.02]" : "scale-100"}`}
                      style={{
                        transitionDelay: loaded ? `${index * 100}ms` : "0ms",
                      }}
                      onMouseEnter={() => setHoveredButton(card.id)}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 
                        group-hover:opacity-5 transition-opacity duration-300`}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 sm:gap-4"> 
                          <div className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl 
                            bg-gradient-to-br ${card.gradient} 
                            flex items-center justify-center shadow-lg
                            group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg 
                              group-hover:text-gray-800 transition-colors">
                              {card.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              className={`transition-all duration-1000 delay-300 ${
                loaded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
              }`}
            >
              <div>
                <AttendanceRecords />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}