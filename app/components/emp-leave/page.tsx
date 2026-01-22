"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  History,
  CalendarDays,
  Plus,
  X,
  Activity,
  Target,
  UserCheck,
  TrendingUp,
  Filter,
  ChevronRight,
  Home,
  Briefcase,
  Clock,
  AlertCircle,
  Shield,
  Edit2,
  Clock4,
  CheckSquare,
  Thermometer,
  Plane,
  Calendar,
  Zap,
  ShieldCheck,
  HomeIcon,
  BriefcaseBusiness,
  Clock3,
  CheckCircle
} from "lucide-react";

const TOTAL_LIMIT = 12;
const TOTAL_WORK_DAYS = 320;

const formatTime = (timeStr?: string) => {
  if (!timeStr) return "--:--";
  return new Date(timeStr).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const LeaveForm = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaveHistoryModalOpen, setIsLeaveHistoryModalOpen] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<any>(null);
  const [summary, setSummary] = useState({ 
    sick: TOTAL_LIMIT, 
    casual: TOTAL_LIMIT, 
    plannedRequests: 0, 
    unplannedRequests: 0,
    permissionSummary: {
      permission: { usedHours: 0, remainingHours: 8, limit: 8, pendingRequests: 0 },
      onDuty: { usedHours: 0, remainingHours: 8, limit: 8, pendingRequests: 0 },
      wfh: { usedDays: 0, remainingDays: 4, limit: 4, pendingRequests: 0 },
      forgotCheck: { pendingRequests: 0 }
    }
  });
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [leaveType, setLeaveType] = useState("sick");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [empIdOrEmail, setEmpIdOrEmail] = useState("");
  const [employeeName, setEmployeeName] = useState("Loading...");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState({
    summary: true,
    history: true,
    attendance: true
  });

  // New state for permission types
  const [requestType, setRequestType] = useState<"leave" | "permission">("leave");
  const [permissionType, setPermissionType] = useState("permission");
  const [permissionDate, setPermissionDate] = useState("");
  const [permissionStartTime, setPermissionStartTime] = useState("");
  const [permissionEndTime, setPermissionEndTime] = useState("");
  
  // Enhanced duration options
  const [durationOption, setDurationOption] = useState<"hours" | "first-half" | "second-half" | "minutes">("hours");
  const [hoursDuration, setHoursDuration] = useState("1");
  const [minutesDuration, setMinutesDuration] = useState("30");
  
  const [forgotCheckType, setForgotCheckType] = useState<"in" | "out">("in");
  const [forgotDate, setForgotDate] = useState("");
  const [forgotTime, setForgotTime] = useState("");
  const [forgotReason, setForgotReason] = useState("");
  
  // New state for editable durations
  const [editableDays, setEditableDays] = useState("1");
  const [isCalculatingFromDates, setIsCalculatingFromDates] = useState(true);

  // Function to get current employee ID from localStorage
  const getCurrentEmployeeId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("userEmpId") || localStorage.getItem("empId") || "";
    }
    return "";
  };

  const calculateSummaryFromRequests = useCallback((requests: any[]) => {
    // Initialize summary with default values
    const newSummary = {
      sick: TOTAL_LIMIT,
      casual: TOTAL_LIMIT,
      plannedRequests: 0,
      unplannedRequests: 0,
      permissionSummary: {
        permission: { usedHours: 0, remainingHours: 8, limit: 8, pendingRequests: 0 },
        onDuty: { usedHours: 0, remainingHours: 8, limit: 8, pendingRequests: 0 },
        wfh: { usedDays: 0, remainingDays: 4, limit: 4, pendingRequests: 0 },
        forgotCheck: { pendingRequests: 0 }
      }
    };

    // Separate leave and permission requests
    const leaveRequests = requests.filter(req => req.leaveType);
    const permissionRequests = requests.filter(req => req.permissionType);

    // Calculate leave balances
    let sickUsed = 0;
    let casualUsed = 0;
    let plannedCount = 0;
    let unplannedCount = 0;

    leaveRequests.forEach(req => {
      if (req.status === 'approved' || req.status === 'auto-approved') {
        const days = req.days || 0;
        if (req.leaveType === 'sick') {
          sickUsed += days;
        } else if (req.leaveType === 'casual') {
          casualUsed += days;
        }
      }
      if (req.leaveType === 'planned') {
        plannedCount++;
      } else if (req.leaveType === 'unplanned') {
        unplannedCount++;
      }
    });

    // Calculate permission usage
    let permissionUsed = 0;
    let onDutyUsed = 0;
    let wfhUsed = 0;
    let permissionPending = 0;
    let onDutyPending = 0;
    let wfhPending = 0;
    let forgotCheckPending = 0;

    permissionRequests.forEach(req => {
      const duration = parseFloat(req.duration) || 0;
      const days = req.days || 0;
      
      if (req.status === 'approved' || req.status === 'auto-approved') {
        switch(req.permissionType) {
          case 'permission':
            permissionUsed += duration;
            break;
          case 'on-duty':
            onDutyUsed += duration;
            break;
          case 'wfh':
            wfhUsed += days;
            break;
        }
      }
      
      if (req.status === 'pending' || req.status === 'manager-pending') {
        switch(req.permissionType) {
          case 'permission':
            permissionPending++;
            break;
          case 'on-duty':
            onDutyPending++;
            break;
          case 'wfh':
            wfhPending++;
            break;
          case 'forgot-check':
            forgotCheckPending++;
            break;
        }
      }
    });

    // Update summary state
    setSummary({
      sick: Math.max(0, TOTAL_LIMIT - sickUsed),
      casual: Math.max(0, TOTAL_LIMIT - casualUsed),
      plannedRequests: plannedCount,
      unplannedRequests: unplannedCount,
      permissionSummary: {
        permission: { 
          usedHours: permissionUsed, 
          remainingHours: Math.max(0, 8 - permissionUsed), 
          limit: 8, 
          pendingRequests: permissionPending 
        },
        onDuty: { 
          usedHours: onDutyUsed, 
          remainingHours: Math.max(0, 8 - onDutyUsed), 
          limit: 8, 
          pendingRequests: onDutyPending 
        },
        wfh: { 
          usedDays: wfhUsed, 
          remainingDays: Math.max(0, 4 - wfhUsed), 
          limit: 4, 
          pendingRequests: wfhPending 
        },
        forgotCheck: { pendingRequests: forgotCheckPending }
      }
    });
  }, []);

  const refreshData = useCallback(async () => {
    const id = getCurrentEmployeeId();
    if (!id) {
      console.error("No employee ID found");
      setIsLoading({
        summary: false,
        history: false,
        attendance: false
      });
      return;
    }
    
    // Reset loading states
    setIsLoading({
      summary: true,
      history: true,
      attendance: true
    });

    try {
      // Fetch employee-specific data
      const employeeId = id;
      
      // 1. Fetch leave history for this employee
      const historyRes = await fetch(`/api/leaves?empIdOrEmail=${encodeURIComponent(employeeId)}&mode=list`);
      let historyData = [];
      if (historyRes.ok) {
        historyData = await historyRes.json();
        if (!Array.isArray(historyData)) {
          historyData = [];
        }
      }

      // 2. Fetch permission history for this employee
      const permissionRes = await fetch(`/api/permissions?empIdOrEmail=${encodeURIComponent(employeeId)}&mode=list`);
      let permissionData = [];
      if (permissionRes.ok) {
        permissionData = await permissionRes.json();
        if (!Array.isArray(permissionData)) {
          permissionData = [];
        }
      }
      
      // Combine both leave and permission requests and filter to this employee
      const allRequests = [
        ...historyData,
        ...permissionData
      ].filter((req: any) => 
        req.empIdOrEmail === employeeId || 
        req.employeeId === employeeId ||
        req.empId === employeeId
      );

      // Calculate summary from all requests
      calculateSummaryFromRequests(allRequests);
      setIsLoading(prev => ({ ...prev, summary: false }));

      // Set user requests
      setUserRequests(allRequests);
      setIsLoading(prev => ({ ...prev, history: false }));

      // 3. Fetch attendance for this employee
      const attendanceRes = await fetch(`/api/attendance?empId=${encodeURIComponent(employeeId)}`);
      let attendanceData = [];
      if (attendanceRes.ok) {
        const attData = await attendanceRes.json();
        attendanceData = attData.attendances || attData || [];
      }
      
      // Filter attendance to this employee
      const employeeAttendance = attendanceData.filter?.((att: any) => 
        att.empId === employeeId || att.employeeId === employeeId
      ) || [];
      setAttendanceList(employeeAttendance);
      setIsLoading(prev => ({ ...prev, attendance: false }));

    } catch (error) { 
      console.error("Error fetching employee data:", error);
      setIsLoading({
        summary: false,
        history: false,
        attendance: false
      });
    }
  }, [calculateSummaryFromRequests]);

  useEffect(() => {
    const initializeEmployeeData = async () => {
      if (typeof window === 'undefined') return;
      
      const id = getCurrentEmployeeId();
      const name = localStorage.getItem("userName") || localStorage.getItem("name") || id;
      
      if (id) { 
        setEmpIdOrEmail(id); 
        setEmployeeName(name); 
        setIsLoggedIn(true);
        await refreshData();
      } else {
        // Redirect to login if no employee ID found
        window.location.href = '/login';
      }
    };

    initializeEmployeeData();
  }, [refreshData]);

  // Calculate days when start/end dates change
  useEffect(() => {
    if (startDate && endDate && isCalculatingFromDates) {
      const days = calculateDays(startDate, endDate);
      setEditableDays(days.toString());
    }
  }, [startDate, endDate, isCalculatingFromDates]);

  // Calculate duration when times change for permission
  useEffect(() => {
    if (permissionStartTime && permissionEndTime && permissionType === "permission") {
      const duration = calculateTimeDuration(permissionStartTime, permissionEndTime);
      setHoursDuration(parseFloat(duration).toFixed(1));
    }
  }, [permissionStartTime, permissionEndTime, permissionType]);

  const filteredAttendance = useMemo(() => {
    if (isLoading.attendance) return [];
    
    let filtered = attendanceList;
    if (selectedMonth !== "all") {
      filtered = attendanceList.filter((att) => {
        const attDate = new Date(att.date);
        const monthYear = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}`;
        return monthYear === selectedMonth;
      });
    }
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceList, selectedMonth, isLoading.attendance]);

  const sortedRequests = useMemo(() => {
    if (isLoading.history) return [];
    return [...userRequests].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate || a.date || 0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [userRequests, isLoading.history]);

  const monthOptions = useMemo(() => {
    if (isLoading.attendance) return [];
    
    const months = new Set<string>();
    attendanceList.forEach(att => {
      if (att.date) {
        const d = new Date(att.date);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [attendanceList, isLoading.attendance]);

  const annualStats = useMemo(() => {
    if (isLoading.summary || isLoading.history || isLoading.attendance) {
      return {
        totalTaken: 0,
        presentCount: 0,
        sickTaken: 0,
        casualTaken: 0,
        attendanceProgress: 0,
        leaveImpact: 0,
        sickUsagePercentage: 0,
        casualUsagePercentage: 0
      };
    }
    
    // Calculate leaves taken (approved only)
    const sickTaken = TOTAL_LIMIT - summary.sick;
    const casualTaken = TOTAL_LIMIT - summary.casual;
    const totalTaken = sickTaken + casualTaken;
    
    // Calculate attendance stats
    const presentCount = attendanceList.filter(a => a.present).length;
    
    // Calculate percentages
    const attendanceProgress = (presentCount / TOTAL_WORK_DAYS) * 100;
    const leaveImpact = (totalTaken / TOTAL_WORK_DAYS) * 100;
    const sickUsagePercentage = (sickTaken / TOTAL_LIMIT) * 100;
    const casualUsagePercentage = (casualTaken / TOTAL_LIMIT) * 100;

    return {
      totalTaken,
      presentCount,
      sickTaken,
      casualTaken,
      attendanceProgress,
      leaveImpact,
      sickUsagePercentage,
      casualUsagePercentage
    };
  }, [summary, attendanceList, isLoading.summary, isLoading.history, isLoading.attendance]);

  const handleViewLeaveDetails = (req: any) => {
    setSelectedLeaveDetails(req);
    setIsLeaveHistoryModalOpen(true);
  };

  const getFinalDuration = () => {
    switch (durationOption) {
      case "hours":
        return parseFloat(hoursDuration).toFixed(1);
      case "first-half":
        return "4.0"; // 4 hours for first half
      case "second-half":
        return "4.0"; // 4 hours for second half
      case "minutes":
        return (parseFloat(minutesDuration) / 60).toFixed(1);
      default:
        return "1.0";
    }
  };

  const getDurationLabel = () => {
    switch (durationOption) {
      case "hours":
        return `${hoursDuration} hours`;
      case "first-half":
        return "First Half (4 hours)";
      case "second-half":
        return "Second Half (4 hours)";
      case "minutes":
        return `${minutesDuration} minutes (${(parseFloat(minutesDuration) / 60).toFixed(1)} hours)`;
      default:
        return "1 hour";
    }
  };

  const handleSubmitRequest = async () => {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
      alert("Please log in to submit requests");
      return;
    }

    if (requestType === "leave") {
      // Leave request
      if (!startDate) {
        alert("Please select a start date");
        return;
      }
      
      const days = editableDays && parseFloat(editableDays) > 0 ? parseFloat(editableDays) : calculateDays(startDate, endDate || startDate);
      
      const leaveData = {
        empIdOrEmail: employeeId,
        leaveType,
        startDate,
        endDate: endDate || startDate,
        days: days,
        description,
        status: "pending",
        employeeId: employeeId,
        employeeName: employeeName
      };

      try {
        const response = await fetch('/api/leaves', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(leaveData)
        });

        if (response.ok) {
          alert("Leave request submitted successfully!");
          setIsModalOpen(false);
          resetForm();
          refreshData();
        } else {
          const error = await response.json();
          alert(error.error || "Failed to submit leave request");
        }
      } catch (error) {
        console.error('Error submitting leave request:', error);
        alert("An error occurred. Please try again.");
      }
    } else {
      // Permission request
      let permissionData: any = {
        empIdOrEmail: employeeId,
        requestType: "permission",
        permissionType,
        employeeId: employeeId,
        employeeName: employeeName,
        status: "pending"
      };

      const finalDuration = getFinalDuration();

      if (permissionType === "permission") {
        if (!permissionDate) {
          alert("Please select date for permission");
          return;
        }
        
        permissionData = {
          ...permissionData,
          date: permissionDate,
          startTime: permissionStartTime || "09:00",
          endTime: permissionEndTime || "10:00",
          duration: finalDuration,
          reason: description,
          description
        };
      } else if (permissionType === "wfh") {
        if (!startDate || !endDate) {
          alert("Please select date range for WFH");
          return;
        }
        
        permissionData = {
          ...permissionData,
          startDate,
          endDate,
          days: editableDays || calculateDays(startDate, endDate),
          reason: description,
          description
        };
      } else if (permissionType === "on-duty") {
        if (!permissionDate) {
          alert("Please select date for On Duty");
          return;
        }
        
        permissionData = {
          ...permissionData,
          date: permissionDate,
          time: permissionStartTime || "09:00",
          duration: finalDuration,
          reason: description,
          description
        };
      } else if (permissionType === "forgot-check") {
        if (!forgotDate || !forgotTime) {
          alert("Please select date and time for forgot check");
          return;
        }
        
        permissionData = {
          ...permissionData,
          date: forgotDate,
          time: forgotTime,
          forgotType: forgotCheckType,
          forgotReason: forgotReason || description,
          reason: description,
          description
        };
      }

      try {
        const response = await fetch('/api/permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(permissionData)
        });

        if (response.ok) {
          alert(`${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} request submitted successfully!`);
          setIsModalOpen(false);
          resetForm();
          refreshData();
        } else {
          const error = await response.json();
          alert(error.error || "Failed to submit permission request");
        }
      } catch (error) {
        console.error('Error submitting permission request:', error);
        alert("An error occurred. Please try again.");
      }
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const calculateTimeDuration = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    let durationMinutes = endTotalMinutes - startTotalMinutes;
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    
    return (durationMinutes / 60).toFixed(1);
  };

  const resetForm = () => {
    setLeaveType("sick");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setRequestType("leave");
    setPermissionType("permission");
    setPermissionDate("");
    setPermissionStartTime("");
    setPermissionEndTime("");
    setDurationOption("hours");
    setHoursDuration("1");
    setMinutesDuration("30");
    setForgotCheckType("in");
    setForgotDate("");
    setForgotTime("");
    setForgotReason("");
    setEditableDays("1");
    setIsCalculatingFromDates(true);
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditableDays(value);
    setIsCalculatingFromDates(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sick': return <Thermometer className="w-5 h-5" />;
      case 'casual': return <Plane className="w-5 h-5" />;
      case 'planned': return <Calendar className="w-5 h-5" />;
      case 'unplanned': return <Zap className="w-5 h-5" />;
      case 'permission': return <ShieldCheck className="w-5 h-5" />;
      case 'wfh': return <HomeIcon className="w-5 h-5" />;
      case 'on-duty': return <BriefcaseBusiness className="w-5 h-5" />;
      case 'forgot-check': return <Clock3 className="w-5 h-5" />;
      default: return <CalendarDays className="w-5 h-5" />;
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
      case 'auto-approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'manager-pending':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'auto-approved':
        return 'Auto Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending TL Review';
      case 'manager-pending':
        return 'Pending Manager Review';
      default:
        return status;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header Section */}
      <div className="mb-8 mt-20">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Leave & Attendance Dashboard</h1>
        <p className="text-gray-600">Welcome back, {employeeName}</p>
        <p className="text-sm text-gray-500 mt-1">Employee ID: {empIdOrEmail}</p>
      </div>

      {/* Fixed "Apply Leave or Permission" button */}
      <button 
        onClick={() => setIsModalOpen(true)} 
        className="fixed bottom-6 right-6 z-40 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors md:bottom-8 md:right-8"
      >
        <Plus className="w-5 h-5" /> Apply
      </button>

      <div className="max-w-7xl mx-auto">
        {/* Stats Cards Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Leave Balance & Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {isLoading.summary || isLoading.attendance ? (
              Array.from({ length: 5 }).map((_, index) => (
                <StatBoxSkeleton key={index} />
              ))
            ) : (
              <>
                <StatBox 
                  icon={<UserCheck className="text-blue-600" />} 
                  label="Presence" 
                  value={annualStats.presentCount} 
                  sub={`/ ${TOTAL_WORK_DAYS} Days`} 
                  progress={annualStats.attendanceProgress} 
                  color="bg-blue-600" 
                  progressBg="bg-blue-100" 
                />
                <StatBox 
                  icon={<Thermometer className="text-indigo-600" />} 
                  label="Sick Leave" 
                  value={summary.sick} 
                  sub={`Taken: ${annualStats.sickTaken}`} 
                  progress={annualStats.sickUsagePercentage}
                  color="bg-indigo-600" 
                  progressBg="bg-indigo-100" 
                  isBalance={true}
                  totalLimit={TOTAL_LIMIT}
                />
                <StatBox 
                  icon={<Plane className="text-purple-600" />} 
                  label="Casual Leave" 
                  value={summary.casual} 
                  sub={`Taken: ${annualStats.casualTaken}`} 
                  progress={annualStats.casualUsagePercentage}
                  color="bg-purple-600" 
                  progressBg="bg-purple-100" 
                  isBalance={true}
                  totalLimit={TOTAL_LIMIT}
                />
                <StatBox 
                  icon={<TrendingUp className="text-red-600" />} 
                  label="Total Taken" 
                  value={annualStats.totalTaken} 
                  sub="Leaves (All)" 
                  progress={annualStats.leaveImpact} 
                  color="bg-red-600" 
                  progressBg="bg-red-100" 
                />
                <StatBox 
                  icon={<Target className="text-orange-600" />} 
                  label="Impact" 
                  value={annualStats.totalTaken} 
                  sub={`/ ${TOTAL_WORK_DAYS} Days`} 
                  progress={annualStats.leaveImpact} 
                  color="bg-orange-600" 
                  progressBg="bg-orange-100" 
                />
              </>
            )}
          </div>
          
          {/* Permission Stats Row */}
          <h2 className="text-lg font-semibold text-gray-700 mb-4 mt-8">Permission Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {!isLoading.summary && (
              <>
                <PermissionStatBox 
                  type="permission"
                  label="Permission"
                  used={summary.permissionSummary.permission.usedHours}
                  remaining={summary.permissionSummary.permission.remainingHours}
                  limit={summary.permissionSummary.permission.limit}
                  unit="hours"
                  pending={summary.permissionSummary.permission.pendingRequests}
                  color="bg-blue-500"
                  icon={<ShieldCheck className="w-5 h-5" />}
                />
                <PermissionStatBox 
                  type="on-duty"
                  label="On Duty"
                  used={summary.permissionSummary.onDuty.usedHours}
                  remaining={summary.permissionSummary.onDuty.remainingHours}
                  limit={summary.permissionSummary.onDuty.limit}
                  unit="hours"
                  pending={summary.permissionSummary.onDuty.pendingRequests}
                  color="bg-green-500"
                  icon={<BriefcaseBusiness className="w-5 h-5" />}
                />
                <PermissionStatBox 
                  type="wfh"
                  label="WFH"
                  used={summary.permissionSummary.wfh.usedDays}
                  remaining={summary.permissionSummary.wfh.remainingDays}
                  limit={summary.permissionSummary.wfh.limit}
                  unit="days"
                  pending={summary.permissionSummary.wfh.pendingRequests}
                  color="bg-purple-500"
                  icon={<HomeIcon className="w-5 h-5" />}
                />
                <PermissionStatBox 
                  type="forgot-check"
                  label="Forgot Check"
                  pending={summary.permissionSummary.forgotCheck.pendingRequests}
                  color="bg-amber-500"
                  icon={<Clock3 className="w-5 h-5" />}
                />
              </>
            )}
          </div>
        </div>

        {/* Leave History Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Leave & Permission History</h2>
                <p className="text-sm text-gray-600">Track all your requests</p>
              </div>
            </div>
            {!isLoading.attendance && monthOptions.length > 0 && (
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                <Filter className="w-4 h-4 text-gray-500" />
                <select 
                  className="text-sm border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer min-w-[140px]"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="all">All Months</option>
                  {monthOptions.map(m => (
                    <option key={m} value={m}>
                      {new Date(m + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="overflow-auto">
            {isLoading.history ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading history...</p>
                </div>
              </div>
            ) : (
              <div className="min-w-full">
                <table className="w-full">
                  <thead className="bg-gray-50 text-sm text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 text-left">Type</th>
                      <th className="py-3 px-4 text-left">Date Range</th>
                      <th className="py-3 px-4 text-left">Duration</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sortedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 px-4 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <CalendarDays className="w-8 h-8 text-gray-300" />
                            <p>No requests found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedRequests.map((req, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${
                                req.leaveType === 'sick' ? 'bg-red-50 text-red-600' :
                                req.leaveType === 'casual' ? 'bg-green-50 text-green-600' :
                                req.permissionType === 'wfh' ? 'bg-purple-50 text-purple-600' :
                                req.permissionType === 'on-duty' ? 'bg-blue-50 text-blue-600' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {getTypeIcon(req.leaveType || req.permissionType || 'default')}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 capitalize">
                                  {req.leaveType || req.permissionType}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {req.requestType || (req.leaveType ? 'Leave' : 'Permission')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-gray-700">
                              {req.startDate ? (
                                <>
                                  <span className="font-medium">
                                    {new Date(req.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  {req.endDate && req.endDate !== req.startDate && (
                                    <>
                                      <span className="mx-1">-</span>
                                      <span className="font-medium">
                                        {new Date(req.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                      </span>
                                    </>
                                  )}
                                </>
                              ) : req.date ? (
                                <span className="font-medium">
                                  {new Date(req.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              ) : 'N/A'}
                              {req.startTime && req.endTime && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {req.startTime} - {req.endTime}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-blue-700">
                              {req.days ? `${req.days} Days` : 
                               req.duration ? `${req.duration} Hours` : 
                               req.forgotType === 'in' ? 'Check-in' : 'Check-out'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(req.status)}`}>
                              {req.status.includes('app') && <CheckCircle className="w-3 h-3 mr-1" />}
                              {getStatusText(req.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button 
                              onClick={() => handleViewLeaveDetails(req)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              View <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Leave/Permission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full mt-15 max-w-lg rounded-xl p-6 shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Apply Leave/Permission</h2>
              <button 
                onClick={() => {setIsModalOpen(false); resetForm();}} 
                className="hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Employee Info */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Employee: {employeeName}</p>
              <p className="text-xs text-blue-600">ID: {empIdOrEmail}</p>
            </div>
            
            {/* Request Type Selection */}
            <div className="flex gap-3 mb-6">
              <button
                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
                  requestType === "leave" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setRequestType("leave")}
              >
                Leave Request
              </button>
              <button
                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
                  requestType === "permission" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setRequestType("permission")}
              >
                Permission
              </button>
            </div>

            {requestType === "leave" ? (
              // Leave Request Form
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg outline-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="planned">Planned Leave</option>
                    <option value="unplanned">Unplanned Leave</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
                  <input 
                    type="number" 
                    min="0.5"
                    step="0.5"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                    value={editableDays}
                    onChange={handleDaysChange}
                    placeholder="Enter days"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {startDate && endDate ? `Calculated: ${calculateDays(startDate, endDate)} days` : "Select dates to calculate days"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea 
                    placeholder="Reason for leave..." 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg h-24 resize-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              // Permission Request Form
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permission Type</label>
                  <select 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg outline-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    value={permissionType}
                    onChange={(e) => setPermissionType(e.target.value)}
                  >
                    <option value="permission">Permission</option>
                    <option value="wfh">Work From Home (WFH)</option>
                    <option value="on-duty">On Duty</option>
                    <option value="forgot-check">Forgot to Check-in/out</option>
                  </select>
                </div>

                {permissionType === "permission" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input 
                        type="date" 
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                        value={permissionDate}
                        onChange={(e) => setPermissionDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Time (Optional)</label>
                        <input 
                          type="time" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={permissionStartTime}
                          onChange={(e) => setPermissionStartTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Time (Optional)</label>
                        <input 
                          type="time" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={permissionEndTime}
                          onChange={(e) => setPermissionEndTime(e.target.value)}
                          min={permissionStartTime}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "hours" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("hours")}
                        >
                          Hours
                        </button>
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "first-half" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("first-half")}
                        >
                          First Half
                        </button>
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "second-half" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("second-half")}
                        >
                          Second Half
                        </button>
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "minutes" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("minutes")}
                        >
                          Minutes
                        </button>
                      </div>
                      
                      {durationOption === "hours" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              min="0.5"
                              step="0.5"
                              className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                              value={hoursDuration}
                              onChange={(e) => setHoursDuration(e.target.value)}
                              placeholder="Enter hours"
                            />
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Hours</span>
                          </div>
                          <div className="flex gap-2">
                            {["0.5", "1", "2", "3", "4"].map(hour => (
                              <button
                                key={hour}
                                type="button"
                                className="flex-1 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                onClick={() => setHoursDuration(hour)}
                              >
                                {hour}h
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {durationOption === "minutes" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              min="15"
                              step="15"
                              className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                              value={minutesDuration}
                              onChange={(e) => setMinutesDuration(e.target.value)}
                              placeholder="Enter minutes"
                            />
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Minutes</span>
                          </div>
                          <div className="flex gap-2">
                            {["15", "30", "45", "60", "90", "120"].map(min => (
                              <button
                                key={min}
                                type="button"
                                className="flex-1 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                onClick={() => setMinutesDuration(min)}
                              >
                                {min}m
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                      <textarea 
                        placeholder="Reason for permission..." 
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg h-24 resize-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {permissionType === "wfh" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                        <input 
                          type="date" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                        <input 
                          type="date" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
                      <input 
                        type="number" 
                        min="0.5"
                        step="0.5"
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                        value={editableDays}
                        onChange={handleDaysChange}
                        placeholder="Enter days"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {startDate && endDate ? `Calculated: ${calculateDays(startDate, endDate)} days` : "Select dates to calculate days"}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">WFH Reason</label>
                      <textarea 
                        placeholder="Reason for working from home..." 
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg h-24 resize-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {permissionType === "on-duty" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input 
                          type="date" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={permissionDate}
                          onChange={(e) => setPermissionDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time (Optional)</label>
                        <input 
                          type="time" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={permissionStartTime}
                          onChange={(e) => setPermissionStartTime(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "hours" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("hours")}
                        >
                          Hours
                        </button>
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "first-half" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("first-half")}
                        >
                          First Half
                        </button>
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "second-half" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("second-half")}
                        >
                          Second Half
                        </button>
                        <button
                          type="button"
                          className={`py-2 rounded-lg font-medium transition-colors ${
                            durationOption === "minutes" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => setDurationOption("minutes")}
                        >
                          Minutes
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">On Duty Reason</label>
                      <textarea 
                        placeholder="Reason for on duty..." 
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg h-24 resize-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {permissionType === "forgot-check" && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <button
                        className={`py-2.5 rounded-lg font-medium transition-colors ${
                          forgotCheckType === "in" 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        onClick={() => setForgotCheckType("in")}
                      >
                        Forgot Check-in
                      </button>
                      <button
                        className={`py-2.5 rounded-lg font-medium transition-colors ${
                          forgotCheckType === "out" 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        onClick={() => setForgotCheckType("out")}
                      >
                        Forgot Check-out
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input 
                          type="date" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={forgotDate}
                          onChange={(e) => setForgotDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                        <input 
                          type="time" 
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                          value={forgotTime}
                          onChange={(e) => setForgotTime(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                      <textarea 
                        placeholder={`Reason for forgetting to check-${forgotCheckType}...`} 
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg h-24 resize-none text-gray-800 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors outline-none"
                        value={forgotReason}
                        onChange={(e) => setForgotReason(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <button 
              onClick={handleSubmitRequest}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm mt-6"
            >
              {requestType === "leave" ? "Submit Leave Request" : "Submit Permission Request"}
            </button>
          </div>
        </div>
      )}

      {/* Leave/Permission Details Modal */}
      {isLeaveHistoryModalOpen && selectedLeaveDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Request Details</h2>
              <button 
                onClick={() => setIsLeaveHistoryModalOpen(false)} 
                className="hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Request Type</p>
                  <p className="font-semibold text-blue-900 capitalize">
                    {selectedLeaveDetails.leaveType ? `Leave - ${selectedLeaveDetails.leaveType}` : 
                     selectedLeaveDetails.permissionType ? `Permission - ${selectedLeaveDetails.permissionType}` : 'Unknown'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1 font-medium">Status</p>
                  <p className={`font-semibold ${getStatusBadgeClass(selectedLeaveDetails.status).replace(/bg-|text-|border/g, '').split(' ')[0]}`}>
                    {getStatusText(selectedLeaveDetails.status)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1 font-medium">Date Range</p>
                  <p className="font-medium text-gray-800">
                    {selectedLeaveDetails.startDate ? (
                      <>
                        {new Date(selectedLeaveDetails.startDate).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric'
                        })}
                        {selectedLeaveDetails.endDate && selectedLeaveDetails.endDate !== selectedLeaveDetails.startDate ? 
                          ` - ${new Date(selectedLeaveDetails.endDate).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short'
                          })}` : ''}
                      </>
                    ) : selectedLeaveDetails.date ? (
                      new Date(selectedLeaveDetails.date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric'
                      })
                    ) : 'N/A'}
                  </p>
                  {selectedLeaveDetails.startTime && selectedLeaveDetails.endTime && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedLeaveDetails.startTime} - {selectedLeaveDetails.endTime}
                    </p>
                  )}
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Duration</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {selectedLeaveDetails.days ? `${selectedLeaveDetails.days} Day${selectedLeaveDetails.days > 1 ? 's' : ''}` :
                     selectedLeaveDetails.duration ? `${selectedLeaveDetails.duration} Hour${parseFloat(selectedLeaveDetails.duration) > 1 ? 's' : ''}` :
                     selectedLeaveDetails.forgotType === 'in' ? 'Missed Check-in' : 'Missed Check-out'}
                  </p>
                </div>
                
                {selectedLeaveDetails.description && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Reason</p>
                    <p className="text-gray-700">{selectedLeaveDetails.description}</p>
                  </div>
                )}

                {selectedLeaveDetails.reason && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 mb-2 font-medium">Additional Reason</p>
                    <p className="text-gray-700">{selectedLeaveDetails.reason}</p>
                  </div>
                )}

                {selectedLeaveDetails.forgotReason && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-600 mb-2 font-medium">Forgot Reason</p>
                    <p className="text-gray-700">{selectedLeaveDetails.forgotReason}</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setIsLeaveHistoryModalOpen(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm mt-4"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// StatBox component for main stats
const StatBox = ({ icon, label, value, sub, progress, color, progressBg, isBalance = false, totalLimit = 0 }: any) => (
  <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2.5 rounded-lg ${color.replace('bg-', 'bg-').replace('600', '50')} ${color.replace('bg-', 'text-')}`}>
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
    <div>
      <p className="text-2xl font-semibold text-gray-800 mb-2">
        {isBalance ? `${value} / ${totalLimit}` : value}
      </p>
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} transition-all duration-300`} 
            style={{ width: `${Math.min(progress, 100)}%` }} 
          />
        </div>
        <p className="text-xs text-gray-500 text-right">{progress.toFixed(1)}%</p>
      </div>
    </div>
  </div>
);

// PermissionStatBox component for permission stats
const PermissionStatBox = ({ type, label, used = 0, remaining = 0, limit = 0, unit = "hours", pending = 0, color, icon }: any) => {
  const progress = limit > 0 ? (used / limit) * 100 : 0;
  
  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${color.replace('bg-', 'bg-').replace('500', '50')} ${color.replace('bg-', 'text-')}`}>
          {React.cloneElement(icon, { className: "w-5 h-5" })}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-xs text-gray-500">
            {limit > 0 ? `${unit} remaining` : `${pending} pending`}
          </p>
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-800 mb-2">
          {limit > 0 ? `${remaining} / ${limit}` : pending}
        </p>
        {limit > 0 && (
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${color} transition-all duration-300`} 
                style={{ width: `${Math.min(progress, 100)}%` }} 
              />
            </div>
            <p className="text-xs text-gray-500 text-right">{progress.toFixed(1)}% used</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBoxSkeleton = () => (
  <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 rounded-lg bg-gray-200 animate-pulse">
        <div className="w-5 h-5 bg-gray-300 rounded"></div>
      </div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-1 w-20"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
      </div>
    </div>
    <div>
      <div className="h-8 bg-gray-200 rounded animate-pulse mb-3 w-16"></div>
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-200 animate-pulse" style={{ width: `50%` }} />
        </div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-8 ml-auto"></div>
      </div>
    </div>
  </div>
);

export default LeaveForm;




