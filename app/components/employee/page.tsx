"use client";

import { useState, useEffect } from "react";
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
  LucideIcon,
  Gift,
  Cake,
  PartyPopper
} from "lucide-react";
import { useRouter } from "next/navigation";

interface MenuItem {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  hoverColor: string;
  gradient: string;
  route?: string;
  isExpandable?: boolean;
}

interface SubMenuItem {
  title: string;
  icon: LucideIcon;
  route: string;
}

interface Employee {
  _id: string;
  name: string;
  displayName?: string;
  photo?: string;
  team?: string;
  dateOfBirth: string;
}

interface BirthdayData {
  _id?: string;
  name: string;
  displayName: string;
  photo?: string;
  team?: string;
  daysUntilBirthday: number;
  dateOfBirth: string;
}

export default function EmptyPage() {
  const router = useRouter();
  const [showHRMSSubmenu, setShowHRMSSubmenu] = useState(false);
  const [birthdays, setBirthdays] = useState<BirthdayData[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);

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
      route: "/components/employee/task",
    },
    {
      id: 4,
      title: "Bug Creation",
      description: "For Tester Purpose only",
      icon: FileText,
      color: "from-amber-500 to-amber-600",
      hoverColor: "hover:from-amber-600 hover:to-amber-700",
      gradient: "bg-amber-50",
      route: "/components/qa",
    },
  ];

  const hrmsSubItems: SubMenuItem[] = [
    { title: "Attendance", icon: Calendar, route: "/components/attendance/emp" },
    { title: "Holidays", icon: Palmtree, route: "/components/employee/holidays" },
    { title: "Leaves", icon: Umbrella, route: "/components/emp-leave" },
    { title: "Payslip", icon: ReceiptText, route: "/components/payslip" },
  ];

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    try {
      setLoadingBirthdays(true);
      const response = await fetch('/api/employees?birthdays=true');
      const data = await response.json();
      
      if (data.success && data.birthdays) {
        const upcomingBirthdays = await calculateUpcomingBirthdays(data.birthdays);
        setBirthdays(upcomingBirthdays);
      }
    } catch (error) {
      console.error("Error fetching birthdays:", error);
    } finally {
      setLoadingBirthdays(false);
    }
  };

  const calculateUpcomingBirthdays = async (employees: Employee[]): Promise<BirthdayData[]> => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const result: BirthdayData[] = [];

    const todayBirthdays = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      displayName: emp.displayName || emp.name,
      photo: emp.photo,
      team: emp.team,
      daysUntilBirthday: 0,
      dateOfBirth: emp.dateOfBirth
    }));

    result.push(...todayBirthdays);

    if (result.length < 7) {
      try {
        const allResponse = await fetch('/api/employees');
        const allData = await allResponse.json();
        
        if (allData.success && allData.employees) {
          const allEmployees = allData.employees;
          
          for (const emp of allEmployees) {
            if (emp.dateOfBirth) {
              const dob = new Date(emp.dateOfBirth);
              const dobThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
              
              const nextBirthday = dobThisYear < today 
                ? new Date(currentYear + 1, dob.getMonth(), dob.getDate())
                : dobThisYear;
              
              const diffTime = nextBirthday.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays > 0 && diffDays <= 7) {
                const alreadyExists = result.some(b => 
                  b.name === emp.name || 
                  (emp.displayName && b.displayName === emp.displayName)
                );
                
                if (!alreadyExists) {
                  result.push({
                    _id: emp._id,
                    name: emp.name,
                    displayName: emp.displayName || emp.name,
                    photo: emp.photo,
                    team: emp.team,
                    daysUntilBirthday: diffDays,
                    dateOfBirth: emp.dateOfBirth
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error calculating upcoming birthdays:", error);
      }
    }

    return result.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  };

  const getBirthdayText = (days: number) => {
    if (days === 0) return "🎉 Today's Birthday!";
    if (days === 1) return "🎂 1 day to go";
    return `🎁 ${days} days to go`;
  };

  const getBirthdayColor = (days: number) => {
    if (days === 0) return "bg-gradient-to-br from-pink-500 to-rose-500";
    if (days === 1) return "bg-gradient-to-br from-orange-500 to-amber-500";
    return "bg-gradient-to-br from-blue-500 to-indigo-500";
  };

  const getBirthdayIcon = (days: number) => {
    if (days === 0) return PartyPopper;
    if (days === 1) return Cake;
    return Gift;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col items-center p-4 md:p-8">
      <div className="max-w-7xl w-full">
        
        {/* Header Section - Centered */}
        <div className="text-center mb-12 mt-20 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent mb-4">
            Welcome to Your Workspace
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Choose a module below to access your tools and streamline your workflow
          </p>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - 80% width for menu items */}
          <div className="lg:w-4/5">
            {/* Main Menu Cards - 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                    className={`group relative bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform ${
                      showHRMSSubmenu && item.isExpandable ? 'ring-2 ring-blue-500 scale-105' : 'hover:-translate-y-2'
                    } animate-slide-up border border-gray-100 overflow-hidden h-full`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${item.gradient} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 -mr-16 -mt-16`}></div>
                    
                    <div className="relative flex flex-col items-center text-center space-y-4 h-full justify-center">
                      <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${item.color} ${item.hoverColor} flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-lg`}>
                        <Icon className="w-12 h-12 text-white" strokeWidth={2} />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
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
              <div className="animate-slide-up bg-white/40 p-6 rounded-3xl border border-blue-100 backdrop-blur-md shadow-inner">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">HRMS Options</h3>
                    <p className="text-gray-600">Select an HRMS module to proceed</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              </div>
            )}
          </div>

          {/* Right Column - 20% width for birthdays */}
          <div className="lg:w-1/5">
            <div className="sticky top-8 bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden h-fit">
              {/* Birthday Header */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Cake className="w-8 h-8" />
                  <h2 className="text-xl font-bold">Birthdays</h2>
                </div>
                <p className="text-sm text-pink-100">
                  {loadingBirthdays ? "Loading..." : `Next 7 days`}
                </p>
              </div>

              {/* Birthday List */}
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {loadingBirthdays ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                  </div>
                ) : birthdays.length > 0 ? (
                  <div className="space-y-4">
                    {birthdays.slice(0, 8).map((birthday, index) => {
                      const BirthdayIcon = getBirthdayIcon(birthday.daysUntilBirthday);
                      return (
                        <div
                          key={birthday._id || `${birthday.name}-${index}`}
                          className="group bg-gray-50 hover:bg-white rounded-xl p-4 transition-all duration-300 hover:shadow-md border border-gray-100 hover:border-pink-100 cursor-pointer"
                        >
                          <div className="flex items-start gap-3 mb-2">
                            {birthday.photo ? (
                              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                <img 
                                  src={birthday.photo} 
                                  alt={birthday.displayName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getBirthdayColor(birthday.daysUntilBirthday)}`}>
                                <span className="text-white font-bold text-lg">
                                  {birthday.displayName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-gray-800 truncate text-sm">
                                {birthday.displayName}
                              </h3>
                              <p className="text-xs text-gray-600 truncate">
                                {birthday.team || "No team"}
                              </p>
                            </div>
                            <div className={`p-1 rounded-lg ${birthday.daysUntilBirthday === 0 ? 'bg-pink-100' : 'bg-blue-50'}`}>
                              <BirthdayIcon className={`w-4 h-4 ${
                                birthday.daysUntilBirthday === 0 ? 'text-pink-600' : 
                                birthday.daysUntilBirthday === 1 ? 'text-orange-600' : 
                                'text-blue-600'
                              }`} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${
                              birthday.daysUntilBirthday === 0 ? 'text-pink-600' : 
                              birthday.daysUntilBirthday === 1 ? 'text-orange-600' : 
                              'text-blue-600'
                            }`}>
                              {getBirthdayText(birthday.daysUntilBirthday)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(birthday.dateOfBirth).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">No birthdays</div>
                    <p className="text-gray-500 text-xs">No upcoming birthdays in the next week</p>
                  </div>
                )}
                
                {/* View All Link */}
                {birthdays.length > 8 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button className="w-full text-center text-sm text-pink-600 hover:text-pink-700 font-medium">
                      View All Birthdays →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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