"use client";

import { useState } from "react";
import { 
  Users, 
  CheckSquare, 
  MessageCircle, 
  ArrowRight, 
  Calendar, 
  Umbrella, 
  Palmtree, 
  ReceiptText,
  FileText,
  LucideIcon 
} from "lucide-react";
import { useRouter } from "next/navigation";

// Define the structure for our menu items to satisfy TypeScript
interface MenuItem {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  hoverColor: string;
  gradient: string;
  route?: string;       // Optional because HRMS uses a toggle instead
  isExpandable?: boolean;
}

interface SubMenuItem {
  title: string;
  icon: LucideIcon;
  route: string;
}

export default function EmptyPage() {
  const router = useRouter();
  const [showHRMSSubmenu, setShowHRMSSubmenu] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 1,
      title: "Chat",
      description: "Team Communication",
      icon: MessageCircle,
      color: "from-purple-500 to-purple-600",
      hoverColor: "hover:from-purple-600 hover:to-purple-700",
      gradient: "bg-purple-50",
      route: "/components/employee/chat",
    },
    {
      id: 2,
      title: "HRMS",
      description: "View your Attendance and Leaves",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      gradient: "bg-blue-50",
      isExpandable: true,
    },
    {
      id: 3,
      title: "Tasks",
      description: "Project & Task Management",
      icon: CheckSquare,
      color: "from-emerald-500 to-emerald-600",
      hoverColor: "hover:from-emerald-600 hover:to-emerald-700",
      gradient: "bg-emerald-50",
      // UPDATED ROUTE BELOW
      route: "/components/employee/task",
    },
    {
      id: 4,
      title: "Bug Creation",
      description: "Access your files and reports",
      icon: FileText,
      color: "from-amber-500 to-amber-600",
      hoverColor: "hover:from-amber-600 hover:to-amber-700",
      gradient: "bg-amber-50",
      route: "/components/qa",
    },
  ];

  // Alphabetically ordered sub-menu items
  const hrmsSubItems: SubMenuItem[] = [
    { title: "Attendance", icon: Calendar, route: "/components/attendance/emp" },
    { title: "Holidays", icon: Palmtree, route: "/components/employee/holidays" },
    { title: "Leaves", icon: Umbrella, route: "/components/emp-leave" },
    { title: "Payslip", icon: ReceiptText, route: "/components/payslip" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-7xl w-full">
        
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent mb-4">
            Welcome to Your Workspace
          </h1>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto">
            Choose a module below to access your tools and streamline your workflow
          </p>
        </div>

        {/* Main Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isExpandable) {
                    setShowHRMSSubmenu(!showHRMSSubmenu);
                  } else if (item.route) {
                    router.push(item.route);
                  }
                }}
                className={`group relative bg-white rounded-3xl p-6 shadow-md hover:shadow-2xl transition-all duration-500 transform ${
                  showHRMSSubmenu && item.isExpandable ? 'ring-2 ring-blue-500 scale-105' : 'hover:-translate-y-3'
                } animate-slide-up border border-gray-100 overflow-hidden`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Background Decoration */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${item.gradient} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 -mr-16 -mt-16`}></div>
                
                <div className="relative flex flex-col items-center text-center space-y-4">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} ${item.hoverColor} flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-lg`}>
                    <Icon className="w-10 h-10 text-white" strokeWidth={2} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-700 transition-colors duration-300">
                    <span className="text-sm font-medium">
                      {item.isExpandable ? (showHRMSSubmenu ? "Close Menu" : "View Options") : "Get Started"}
                    </span>
                    <ArrowRight className={`w-4 h-4 transform transition-transform duration-300 ${
                      showHRMSSubmenu && item.isExpandable ? 'rotate-90' : 'group-hover:translate-x-1'
                    }`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* HRMS Expanded Sub-menu */}
        {showHRMSSubmenu && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up bg-white/40 p-6 rounded-3xl border border-blue-100 backdrop-blur-md shadow-inner">
            {hrmsSubItems.map((sub, idx) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.title}
                  onClick={() => router.push(sub.route)}
                  className="flex flex-col items-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-xl hover:bg-white transition-all duration-300 border border-gray-50 group transform hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 mb-3 shadow-sm">
                    <SubIcon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                    {sub.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }
      `}</style>
    </div>
  );
}