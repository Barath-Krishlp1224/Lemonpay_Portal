"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Download,
  Eye,
  RefreshCw,
  Thermometer,
  Plane,
  Zap,
  Home,
  Briefcase,
  Shield,
  Clock3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Building,
  BarChart3,
  CalendarDays,
  History as HistoryIcon
} from "lucide-react";

type LeaveType = "sick" | "casual" | "planned" | "unplanned";
type PermissionType = "permission" | "wfh" | "on-duty" | "forgot-check";
type RequestStatus = "pending" | "manager-pending" | "approved" | "rejected" | "auto-approved";

interface LeaveRequest {
  _id: string;
  employeeName: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  description?: string;
  status: RequestStatus;
  createdAt: string;
  requestType: "leave";
  teamLeadApproved?: boolean;
  managerApproved?: boolean;
}

interface PermissionRequest {
  _id: string;
  employeeName: string;
  employeeId: string;
  permissionType: PermissionType;
  startDate?: string;
  endDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  days?: number;
  forgotType?: "in" | "out";
  forgotReason?: string;
  description?: string;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
  requestType: "permission";
  teamLeadApproved?: boolean;
  managerApproved?: boolean;
}

type Request = LeaveRequest | PermissionRequest;

const TeamLeaveHistoryPage = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterRequestType, setFilterRequestType] = useState<"all" | "leave" | "permission">("all");
  const [filterLeaveType, setFilterLeaveType] = useState<LeaveType | "all">("all");
  const [filterPermissionType, setFilterPermissionType] = useState<PermissionType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // Changed to 5
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    leaveCount: 0,
    permissionCount: 0
  });

  const fetchTeamHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both leaves and permissions
      const [leavesRes, permissionsRes] = await Promise.all([
        fetch('/api/leaves?mode=all'),
        fetch('/api/permissions?mode=all')
      ]);

      const leavesData = await leavesRes.json();
      const permissionsData = await permissionsRes.json();

      const leaves: Request[] = Array.isArray(leavesData) 
        ? leavesData.map((item: any) => ({ 
            ...item, 
            requestType: "leave" as const,
            _id: item._id?.$oid || item._id || item.id
          }))
        : [];

      const permissions: Request[] = Array.isArray(permissionsData)
        ? permissionsData.map((item: any) => ({ 
            ...item, 
            requestType: "permission" as const,
            _id: item._id?.$oid || item._id || item.id
          }))
        : [];

      const allRequests = [...leaves, ...permissions];
      setRequests(allRequests);
      
      // Calculate stats
      const approved = allRequests.filter(r => r.status === "approved" || r.status === "auto-approved").length;
      const pending = allRequests.filter(r => r.status === "pending" || r.status === "manager-pending").length;
      const rejected = allRequests.filter(r => r.status === "rejected").length;
      const leaveCount = leaves.length;
      const permissionCount = permissions.length;
      
      setStats({
        total: allRequests.length,
        approved,
        pending,
        rejected,
        leaveCount,
        permissionCount
      });
      
    } catch (error) {
      console.error("Failed to fetch team history:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamHistory();
  }, [fetchTeamHistory]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) 
        ? "N/A" 
        : date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
    } catch {
      return "N/A";
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? "N/A" : `${date.getDate()}/${date.getMonth() + 1}`;
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) 
        ? "N/A" 
        : date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
    } catch {
      return "N/A";
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "approved":
      case "auto-approved":
        return "bg-green-100 text-green-800 border border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "manager-pending":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case "approved":
      case "auto-approved":
        return <CheckCircle className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      case "pending":
      case "manager-pending":
        return <Clock className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: RequestStatus) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "auto-approved":
        return "Auto Approved";
      case "rejected":
        return "Rejected";
      case "pending":
        return "Pending TL";
      case "manager-pending":
        return "Pending Manager";
      default:
        return status;
    }
  };

  const getTypeIcon = (request: Request) => {
    if (request.requestType === "leave") {
      const leaveReq = request as LeaveRequest;
      switch (leaveReq.leaveType) {
        case "sick":
          return <Thermometer className="w-4 h-4" />;
        case "casual":
          return <Plane className="w-4 h-4" />;
        case "planned":
          return <Calendar className="w-4 h-4" />;
        case "unplanned":
          return <Zap className="w-4 h-4" />;
        default:
          return <FileText className="w-4 h-4" />;
      }
    } else {
      const permReq = request as PermissionRequest;
      switch (permReq.permissionType) {
        case "permission":
          return <Shield className="w-4 h-4" />;
        case "wfh":
          return <Home className="w-4 h-4" />;
        case "on-duty":
          return <Briefcase className="w-4 h-4" />;
        case "forgot-check":
          return <Clock3 className="w-4 h-4" />;
        default:
          return <Shield className="w-4 h-4" />;
      }
    }
  };

  const getTypeColor = (request: Request) => {
    if (request.requestType === "leave") {
      const leaveReq = request as LeaveRequest;
      switch (leaveReq.leaveType) {
        case "sick":
          return "bg-red-500";
        case "casual":
          return "bg-green-500";
        case "planned":
          return "bg-blue-500";
        case "unplanned":
          return "bg-yellow-500";
        default:
          return "bg-gray-500";
      }
    } else {
      const permReq = request as PermissionRequest;
      switch (permReq.permissionType) {
        case "permission":
          return "bg-indigo-500";
        case "wfh":
          return "bg-purple-500";
        case "on-duty":
          return "bg-cyan-500";
        case "forgot-check":
          return "bg-amber-500";
        default:
          return "bg-gray-500";
      }
    }
  };

  const getTypeText = (request: Request) => {
    if (request.requestType === "leave") {
      const leaveReq = request as LeaveRequest;
      return `${leaveReq.leaveType.charAt(0).toUpperCase() + leaveReq.leaveType.slice(1)} Leave`;
    } else {
      const permReq = request as PermissionRequest;
      const typeMap: Record<PermissionType, string> = {
        permission: "Permission",
        wfh: "Work From Home",
        "on-duty": "On Duty",
        "forgot-check": "Forgot Check"
      };
      return typeMap[permReq.permissionType] || "Permission";
    }
  };

  const getRequestDates = (request: Request) => {
    if (request.requestType === "leave") {
      const leaveReq = request as LeaveRequest;
      const startDate = formatShortDate(leaveReq.startDate);
      const endDate = leaveReq.endDate && leaveReq.endDate !== leaveReq.startDate 
        ? `-${formatShortDate(leaveReq.endDate)}` 
        : '';
      return `${startDate}${endDate}`;
    } else {
      const permReq = request as PermissionRequest;
      if (permReq.date) {
        return formatShortDate(permReq.date);
      } else if (permReq.startDate) {
        const startDate = formatShortDate(permReq.startDate);
        const endDate = permReq.endDate && permReq.endDate !== permReq.startDate 
          ? `-${formatShortDate(permReq.endDate)}` 
          : '';
        return `${startDate}${endDate}`;
      }
      return "N/A";
    }
  };

  const getRequestDuration = (request: Request) => {
    if (request.requestType === "leave") {
      const leaveReq = request as LeaveRequest;
      return `${leaveReq.days} day${leaveReq.days !== 1 ? 's' : ''}`;
    } else {
      const permReq = request as PermissionRequest;
      if (permReq.days) {
        return `${permReq.days} day${permReq.days !== 1 ? 's' : ''}`;
      } else if (permReq.duration) {
        return `${permReq.duration} hour${parseFloat(permReq.duration) !== 1 ? 's' : ''}`;
      } else if (permReq.forgotType) {
        return `Forgot ${permReq.forgotType === 'in' ? 'Check-in' : 'Check-out'}`;
      }
      return "N/A";
    }
  };

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        req.employeeName.toLowerCase().includes(term) ||
        req.employeeId.toLowerCase().includes(term) ||
        req.description?.toLowerCase().includes(term) ||
        (req.requestType === "permission" && (req as PermissionRequest).reason?.toLowerCase().includes(term))
      );
    }
    
    // Apply employee filter
    if (filterEmployee) {
      filtered = filtered.filter(req => 
        req.employeeName.toLowerCase().includes(filterEmployee.toLowerCase()) ||
        req.employeeId.toLowerCase().includes(filterEmployee.toLowerCase())
      );
    }
    
    // Apply request type filter
    if (filterRequestType !== "all") {
      filtered = filtered.filter(req => req.requestType === filterRequestType);
    }
    
    // Apply leave type filter
    if (filterRequestType === "leave" && filterLeaveType !== "all") {
      filtered = filtered.filter(req => 
        req.requestType === "leave" && (req as LeaveRequest).leaveType === filterLeaveType
      );
    }
    
    // Apply permission type filter
    if (filterRequestType === "permission" && filterPermissionType !== "all") {
      filtered = filtered.filter(req => 
        req.requestType === "permission" && (req as PermissionRequest).permissionType === filterPermissionType
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(req => req.status === filterStatus);
    }
    
    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(req => {
        const reqDate = new Date(req.createdAt);
        const reqMonthYear = `${reqDate.getFullYear()}-${String(reqDate.getMonth() + 1).padStart(2, '0')}`;
        return reqMonthYear === selectedMonth;
      });
    }
    
    // Sort by creation date (newest first)
    return filtered.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requests, searchTerm, filterEmployee, filterRequestType, filterLeaveType, filterPermissionType, filterStatus, selectedMonth]);

  // Get months for filter
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    requests.forEach(req => {
      const d = new Date(req.createdAt);
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [requests]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterEmployee("");
    setFilterRequestType("all");
    setFilterLeaveType("all");
    setFilterPermissionType("all");
    setFilterStatus("all");
    setSelectedMonth("all");
    setCurrentPage(1);
  };

  const isFilterActive = searchTerm || filterEmployee || filterRequestType !== "all" || 
                         filterLeaveType !== "all" || filterPermissionType !== "all" || 
                         filterStatus !== "all" || selectedMonth !== "all";

  const handleExportCSV = () => {
    const headers = ["Employee Name", "Employee ID", "Request Type", "Leave/Permission Type", 
                     "Start Date", "End Date", "Duration", "Status", "Description", "Created At"];
    
    const csvData = filteredRequests.map(req => {
      const startDate = req.requestType === "leave" 
        ? (req as LeaveRequest).startDate 
        : (req as PermissionRequest).date || (req as PermissionRequest).startDate || "";
      const endDate = req.requestType === "leave" 
        ? (req as LeaveRequest).endDate 
        : (req as PermissionRequest).endDate || "";
      
      return [
        req.employeeName,
        req.employeeId,
        req.requestType === "leave" ? "Leave" : "Permission",
        req.requestType === "leave" 
          ? (req as LeaveRequest).leaveType 
          : (req as PermissionRequest).permissionType,
        formatDate(startDate),
        formatDate(endDate),
        getRequestDuration(req),
        getStatusText(req.status),
        req.description || "",
        formatDate(req.createdAt)
      ];
    });

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-leave-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HistoryIcon className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Leave & Permission History</h1>
              </div>
              <p className="text-gray-700 text-sm">View all leave and permission requests across the team</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-700">
                {stats.leaveCount} Leaves • {stats.permissionCount} Permissions
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-700">
                {((stats.approved / stats.total) * 100 || 0).toFixed(1)}% of total
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-700">
                {((stats.pending / stats.total) * 100 || 0).toFixed(1)}% of total
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-700">
                {((stats.rejected / stats.total) * 100 || 0).toFixed(1)}% of total
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                Filters
              </h2>
              {isFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Quick Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, or reason..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-gray-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    placeholder="Filter by employee..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-gray-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Request Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Request Type
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    value={filterRequestType}
                    onChange={(e) => setFilterRequestType(e.target.value as "all" | "leave" | "permission")}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white text-gray-900"
                  >
                    <option value="all">All Types</option>
                    <option value="leave">Leave Only</option>
                    <option value="permission">Permission Only</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Leave/Permission Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {filterRequestType === "permission" ? "Permission Type" : "Leave Type"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    {filterRequestType === "permission" ? (
                      <Shield className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Calendar className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <select
                    value={filterRequestType === "permission" ? filterPermissionType : filterLeaveType}
                    onChange={(e) => {
                      if (filterRequestType === "permission") {
                        setFilterPermissionType(e.target.value as PermissionType);
                      } else {
                        setFilterLeaveType(e.target.value as LeaveType);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white text-gray-900"
                  >
                    <option value="all">All Types</option>
                    {filterRequestType === "permission" ? (
                      <>
                        <option value="permission">Permission</option>
                        <option value="wfh">WFH</option>
                        <option value="on-duty">On Duty</option>
                        <option value="forgot-check">Forgot Check</option>
                      </>
                    ) : (
                      <>
                        <option value="sick">Sick</option>
                        <option value="casual">Casual</option>
                        <option value="planned">Planned</option>
                        <option value="unplanned">Unplanned</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as RequestStatus | "all")}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white text-gray-900"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending TL</option>
                    <option value="manager-pending">Pending Manager</option>
                    <option value="approved">Approved</option>
                    <option value="auto-approved">Auto Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Month
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white text-gray-900"
                  >
                    <option value="all">All Months</option>
                    {monthOptions.map(month => {
                      const [year, monthNum] = month.split('-');
                      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
                      return (
                        <option key={month} value={month}>
                          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Items per page
                </label>
                <div className="relative">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white text-gray-900"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
              {isFilterActive && " (filtered)"}
            </div>
            <button
              onClick={fetchTeamHistory}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Employee</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Dates</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Duration</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Created</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                        <p className="text-gray-700">Loading team history...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-700 font-medium">No requests found</p>
                        <p className="text-gray-600 text-sm mt-1">
                          {isFilterActive ? "Try changing your filters" : "No leave or permission requests recorded yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{request.employeeName}</p>
                          <p className="text-xs text-gray-700">{request.employeeId}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getTypeColor(request)}`}></div>
                          <div>
                            <p className="text-sm text-gray-900 capitalize">{getTypeText(request)}</p>
                            <p className="text-xs text-gray-700">
                              {request.requestType === "leave" ? "Leave" : "Permission"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">{getRequestDates(request)}</p>
                        {request.requestType === "permission" && (request as PermissionRequest).startTime && (
                          <p className="text-xs text-gray-700">
                            {(request as PermissionRequest).startTime} - {(request as PermissionRequest).endTime}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-blue-700">{getRequestDuration(request)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {getStatusText(request.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">{formatDate(request.createdAt)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300 text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(selectedRequest)} text-white`}>
                    {getTypeIcon(selectedRequest)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Request Details</h3>
                    <p className="text-sm text-gray-700">{getTypeText(selectedRequest)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Employee Information</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{selectedRequest.employeeName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Employee ID</p>
                        <p className="font-medium text-gray-900">{selectedRequest.employeeId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Request Information</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600">Type</p>
                        <p className="font-medium text-gray-900 capitalize">{getTypeText(selectedRequest)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                          {getStatusIcon(selectedRequest.status)}
                          {getStatusText(selectedRequest.status)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Duration</p>
                        <p className="font-medium text-gray-900">{getRequestDuration(selectedRequest)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Date Information</h4>
                    <div className="space-y-2">
                      {selectedRequest.requestType === "leave" ? (
                        <>
                          <div>
                            <p className="text-xs text-gray-600">Start Date</p>
                            <p className="font-medium text-gray-900">{formatDate((selectedRequest as LeaveRequest).startDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">End Date</p>
                            <p className="font-medium text-gray-900">{formatDate((selectedRequest as LeaveRequest).endDate)}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {(selectedRequest as PermissionRequest).date && (
                            <div>
                              <p className="text-xs text-gray-600">Date</p>
                              <p className="font-medium text-gray-900">{formatDate((selectedRequest as PermissionRequest).date!)}</p>
                            </div>
                          )}
                          {(selectedRequest as PermissionRequest).startDate && (
                            <div>
                              <p className="text-xs text-gray-600">Start Date</p>
                              <p className="font-medium text-gray-900">{formatDate((selectedRequest as PermissionRequest).startDate!)}</p>
                            </div>
                          )}
                          {(selectedRequest as PermissionRequest).endDate && (
                            <div>
                              <p className="text-xs text-gray-600">End Date</p>
                              <p className="font-medium text-gray-900">{formatDate((selectedRequest as PermissionRequest).endDate!)}</p>
                            </div>
                          )}
                          {(selectedRequest as PermissionRequest).startTime && (
                            <div>
                              <p className="text-xs text-gray-600">Time</p>
                              <p className="font-medium text-gray-900">
                                {(selectedRequest as PermissionRequest).startTime} - {(selectedRequest as PermissionRequest).endTime}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Requested On</p>
                        <p className="font-medium text-gray-900">{formatDateTime(selectedRequest.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {(selectedRequest.description || (selectedRequest.requestType === "permission" && (selectedRequest as PermissionRequest).reason)) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {selectedRequest.requestType === "permission" && (selectedRequest as PermissionRequest).forgotReason 
                          ? "Forgot Check Reason" 
                          : "Description"}
                      </h4>
                      <p className="text-gray-700 text-sm">
                        {selectedRequest.description || 
                         (selectedRequest.requestType === "permission" && (selectedRequest as PermissionRequest).reason) ||
                         (selectedRequest.requestType === "permission" && (selectedRequest as PermissionRequest).forgotReason)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Timeline */}
              {(selectedRequest.teamLeadApproved !== undefined || selectedRequest.managerApproved !== undefined) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Timeline</h4>
                  <div className="space-y-3">
                    {selectedRequest.teamLeadApproved !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          selectedRequest.teamLeadApproved ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedRequest.teamLeadApproved ? 'Team Lead Approved' : 'Pending Team Lead'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {selectedRequest.teamLeadApproved ? 'Approved by Team Lead' : 'Awaiting Team Lead approval'}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedRequest.managerApproved !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          selectedRequest.managerApproved ? 'bg-green-100 text-green-600' : 
                          selectedRequest.teamLeadApproved ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedRequest.managerApproved ? 'Manager Approved' : 
                             selectedRequest.teamLeadApproved ? 'Pending Manager' : 'Awaiting TL Approval'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {selectedRequest.managerApproved ? 'Approved by Manager' : 
                             selectedRequest.teamLeadApproved ? 'Awaiting Manager approval' : 'Will proceed after TL approval'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaveHistoryPage;