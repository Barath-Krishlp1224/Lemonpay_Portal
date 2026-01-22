"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  Check, 
  X, 
  Clock, 
  Search, 
  User, 
  FileText, 
  Filter, 
  Calendar, 
  AlertCircle,
  Shield,
  Home,
  Briefcase,
  ChevronDown,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock3,
  FileCheck,
  UserCheck,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";

type LeaveType = "sick" | "casual" | "planned" | "unplanned" | "";
type PermissionType = "permission" | "wfh" | "on-duty" | "forgot-check" | "";

type LeaveStatus =
  | "pending"
  | "manager-pending"
  | "approved"
  | "rejected"
  | "auto-approved";

type PermissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto-approved";

type RequestStatus = LeaveStatus | PermissionStatus;

interface LeaveRequest {
  _id: string;
  employeeName?: string;
  employeeId?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  description?: string;
  status: RequestStatus;
  createdAt: string;
  requestType: "leave";
}

interface PermissionRequest {
  _id: string;
  employeeName?: string;
  employeeId?: string;
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
}

type Request = LeaveRequest | PermissionRequest;

interface EmployeeOption {
  empId: string;
  name: string;
}

// Type guard functions
const isLeaveRequest = (request: Request): request is LeaveRequest => {
  return request.requestType === "leave";
};

const isPermissionRequest = (request: Request): request is PermissionRequest => {
  return request.requestType === "permission";
};

const ApprovalPage: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterEmployee, setFilterEmployee] = useState("");
  const [selectedEmployeeEmpId, setSelectedEmployeeEmpId] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState<LeaveType>("");
  const [filterPermissionType, setFilterPermissionType] = useState<PermissionType>("");
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("pending");
  const [filterRequestType, setFilterRequestType] = useState<"all" | "leave" | "permission">("all");

  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "recent">("pending");

  const employeeBoxRef = useRef<HTMLDivElement | null>(null);
  const otherRequestsRef = useRef<HTMLDivElement | null>(null);

  const buildQueryString = () => {
    const params = new URLSearchParams();

    if (selectedEmployeeEmpId) {
      params.append("employeeId", selectedEmployeeEmpId);
    } else if (filterEmployee.trim()) {
      params.append("employeeName", filterEmployee.trim());
    }

    if (filterLeaveType) {
      params.append("leaveType", filterLeaveType);
    }

    if (filterPermissionType) {
      params.append("permissionType", filterPermissionType);
    }

    if (filterRequestType !== "all") {
      params.append("requestType", filterRequestType);
    }

    if (filterStatus !== "all") {
      params.append("status", filterStatus);
    }

    return params.toString();
  };

  const fetchAllRequests = useCallback(async () => {
    const queryString = buildQueryString();
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching requests with query:", queryString);
      
      // Fetch both leaves and permissions
      const [leavesRes, permissionsRes] = await Promise.all([
        fetch(`/api/leaves?${queryString}`),
        fetch(`/api/permissions?${queryString}`)
      ]);

      console.log("Leaves response status:", leavesRes.status);
      console.log("Permissions response status:", permissionsRes.status);

      const leavesData = await leavesRes.json();
      const permissionsData = await permissionsRes.json();

      console.log("Leaves data:", leavesData);
      console.log("Permissions data:", permissionsData);

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

      console.log("Processed leaves:", leaves.length);
      console.log("Processed permissions:", permissions.length);
      
      const allRequests = [...leaves, ...permissions];
      setRequests(allRequests);
      
      console.log("Total requests:", allRequests.length);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setError("Failed to load requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [
    filterEmployee,
    selectedEmployeeEmpId,
    filterLeaveType,
    filterPermissionType,
    filterStatus,
    filterRequestType
  ]);

  useEffect(() => {
    if (!employeeDropdownOpen) {
      const handler = setTimeout(() => {
        fetchAllRequests();
      }, 300);

      return () => clearTimeout(handler);
    }
  }, [
    filterEmployee,
    selectedEmployeeEmpId,
    filterLeaveType,
    filterPermissionType,
    filterStatus,
    filterRequestType,
    employeeDropdownOpen,
    fetchAllRequests,
  ]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        if (data.success && Array.isArray(data.employees)) {
          setEmployeeOptions(
            data.employees.map((emp: any) => ({
              empId: emp.empId,
              name: emp.name,
            }))
          );
        } else {
          console.error("Unexpected employees response:", data);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        employeeBoxRef.current &&
        !employeeBoxRef.current.contains(e.target as Node)
      ) {
        setEmployeeDropdownOpen(false);
        if (filterEmployee) {
          fetchAllRequests();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterEmployee, fetchAllRequests]);

  const handleClearFilter = () => {
    setFilterEmployee("");
    setSelectedEmployeeEmpId("");
    setFilterLeaveType("");
    setFilterPermissionType("");
    setFilterStatus("pending");
    setFilterRequestType("all");
    setEmployeeDropdownOpen(false);
    fetchAllRequests();
  };

  const handleEmployeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterEmployee(value);
    setSelectedEmployeeEmpId("");
    setEmployeeDropdownOpen(true);
  };

  const handleEmployeeSelect = (opt: EmployeeOption) => {
    setFilterEmployee(`${opt.name} (${opt.empId})`);
    setSelectedEmployeeEmpId(opt.empId);
    setEmployeeDropdownOpen(false);
    fetchAllRequests();
  };

  const filteredEmployeeOptions = employeeOptions.filter((opt) =>
    `${opt.name} ${opt.empId}`
      .toLowerCase()
      .includes(filterEmployee.toLowerCase())
  );

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
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "manager-pending":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "auto-approved":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "manager-pending":
        return <UserCheck className="w-3 h-3" />;
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      case "auto-approved":
        return <Clock3 className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getRequestTypeIcon = (request: Request) => {
    if (isLeaveRequest(request)) {
      switch (request.leaveType) {
        case "sick":
          return <AlertCircle className="w-3 h-3" />;
        case "casual":
          return <Calendar className="w-3 h-3" />;
        case "planned":
          return <FileCheck className="w-3 h-3" />;
        case "unplanned":
          return <Clock className="w-3 h-3" />;
        default:
          return <FileText className="w-3 h-3" />;
      }
    } else {
      switch (request.permissionType) {
        case "permission":
          return <Shield className="w-3 h-3" />;
        case "wfh":
          return <Home className="w-3 h-3" />;
        case "on-duty":
          return <Briefcase className="w-3 h-3" />;
        case "forgot-check":
          return <Clock3 className="w-3 h-3" />;
        default:
          return <Shield className="w-3 h-3" />;
      }
    }
  };

  const getRequestTypeColor = (request: Request) => {
    if (isLeaveRequest(request)) {
      switch (request.leaveType) {
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
      switch (request.permissionType) {
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

  const updateRequestStatus = async (id: string, newStatus: RequestStatus) => {
    setIsUpdating(id);
    setError(null);
    
    try {
      const request = requests.find(req => req._id === id);
      if (!request) {
        setError("Request not found");
        return;
      }

      console.log("Updating request:", {
        id,
        requestType: request.requestType,
        currentStatus: request.status,
        newStatus,
        isLeave: isLeaveRequest(request),
        isPermission: isPermissionRequest(request)
      });

      // Determine the correct endpoint based on request type
      const endpoint = isLeaveRequest(request) 
        ? `/api/leaves/${id}/status` 
        : `/api/permissions/${id}/status`;
      
      const bodyData: any = { 
        status: newStatus,
        employeeId: request.employeeId 
      };

      console.log("Sending to endpoint:", endpoint);
      console.log("Request body:", bodyData);

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": "approval-page-user"
        },
        body: JSON.stringify(bodyData),
      });

      const responseData = await res.json();
      console.log("Response status:", res.status);
      console.log("Response data:", responseData);

      if (res.ok) {
        setRequests((prev) =>
          prev.map((req) =>
            req._id === id ? { ...req, status: newStatus } : req
          )
        );
        fetchAllRequests();
      } else {
        setError(`Failed to update request: ${responseData.error || "Server error"}`);
        alert(`Failed to update request: ${responseData.error || "Server error"}`);
        fetchAllRequests();
      }
    } catch (error) {
      console.error(`Error updating request ${id}:`, error);
      setError("Network error occurred while trying to update the request.");
      alert(`Network error occurred while trying to update the request.`);
      fetchAllRequests();
    } finally {
      setIsUpdating(null);
    }
  };

const handleApprove = (id: string) => {
  const request = requests.find((r) => r._id === id);
  if (!request) {
    setError("Request not found");
    return;
  }

  console.log("Approving request:", {
    id,
    requestType: request.requestType,
    currentStatus: request.status
  });

  if (request.status !== "pending") {
    alert("This request is not pending and cannot be manually approved.");
    return;
  }

  // Determine the correct status based on request type
  // For permissions, we can directly approve/reject (no manager-pending step)
  const newStatus = isLeaveRequest(request) ? "manager-pending" : "approved";
  
  console.log('Setting status to:', newStatus);
  updateRequestStatus(id, newStatus);
};

  const handleReject = (id: string) => {
    const request = requests.find((r) => r._id === id);
    if (!request) {
      setError("Request not found");
      return;
    }

    console.log("Rejecting request:", {
      id,
      requestType: request.requestType,
      currentStatus: request.status
    });

    if (request.status !== "pending") {
      alert("This request is not pending and cannot be manually rejected.");
      return;
    }

    updateRequestStatus(id, "rejected");
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
  };

  const getRequestDates = (request: Request) => {
    if (isLeaveRequest(request)) {
      const startDate = formatShortDate(request.startDate);
      const endDate = request.endDate && request.endDate !== request.startDate 
        ? `-${formatShortDate(request.endDate)}` 
        : '';
      return `${startDate}${endDate}`;
    } else {
      if (request.date) {
        return formatShortDate(request.date);
      } else if (request.startDate) {
        const startDate = formatShortDate(request.startDate);
        const endDate = request.endDate && request.endDate !== request.startDate 
          ? `-${formatShortDate(request.endDate)}` 
          : '';
        return `${startDate}${endDate}`;
      }
      return "N/A";
    }
  };

  const getRequestDuration = (request: Request) => {
    if (isLeaveRequest(request)) {
      return `${request.days}d`;
    } else {
      if (request.days) {
        return `${request.days}d`;
      } else if (request.duration) {
        return `${request.duration}h`;
      } else if (request.forgotType) {
        return `Forgot ${request.forgotType === 'in' ? 'In' : 'Out'}`;
      }
      return "N/A";
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const recentRequests = requests
    .filter((r) => r.status !== "pending")
    .sort((a, b) => {
      try {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 5);
  
  const otherRequests = requests.filter((r) => 
    r.status !== "pending" && !recentRequests.includes(r)
  );

  const isFilterActive =
    !!filterEmployee ||
    !!selectedEmployeeEmpId ||
    !!filterLeaveType ||
    !!filterPermissionType ||
    filterStatus !== "pending" ||
    filterRequestType !== "all";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-800">Leave & Permission Approval</h1>
              <p className="text-gray-600 text-xs md:text-sm mt-0.5">Approve or reject requests from your team members</p>
            </div>
            <div className="flex items-center gap-1.5">
              {error && (
                <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
              <button
                onClick={fetchAllRequests}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filter Card */}
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 mb-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filter Requests
              </h2>
              {isFilterActive && (
                <button
                  onClick={handleClearFilter}
                  className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-2 py-0.5 rounded transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* Employee Filter */}
              <div className="lg:col-span-2" ref={employeeBoxRef}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <User className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={filterEmployee}
                    onChange={handleEmployeeInputChange}
                    onFocus={() => setEmployeeDropdownOpen(true)}
                    placeholder="Search by name or ID..."
                    className="w-full pl-7 pr-7 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-black placeholder-gray-600"
                  />
                  {filterEmployee && (
                    <button
                      onClick={() => {
                        setFilterEmployee("");
                        setSelectedEmployeeEmpId("");
                      }}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center"
                    >
                      <X className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                    </button>
                  )}
                </div>

                {employeeDropdownOpen && filteredEmployeeOptions.length > 0 && (
                  <div className="absolute z-50 mt-0.5 w-full bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto text-xs">
                    {filteredEmployeeOptions.map((opt) => (
                      <div
                        key={opt.empId}
                        onClick={() => handleEmployeeSelect(opt)}
                        className="px-2.5 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900 truncate">{opt.name}</div>
                        <div className="text-gray-600">ID: {opt.empId}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Request Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Request Type
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <FileText className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <select
                    value={filterRequestType}
                    onChange={(e) => setFilterRequestType(e.target.value as "all" | "leave" | "permission")}
                    className="w-full pl-7 pr-7 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-black appearance-none bg-white"
                  >
                    <option value="all">All Types</option>
                    <option value="leave">Leave</option>
                    <option value="permission">Permission</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Leave/Permission Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {filterRequestType === "permission" ? "Permission Type" : "Leave Type"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    {filterRequestType === "permission" ? (
                      <Shield className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
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
                    className="w-full pl-7 pr-7 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-black appearance-none bg-white"
                  >
                    <option value="">All Types</option>
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
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as RequestStatus | "all")}
                    className="w-full pl-7 pr-7 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-black appearance-none bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="all">All Status</option>
                    <option value="manager-pending">Manager Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="auto-approved">Auto-Approved</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3 p-3 bg-gray-100 rounded text-xs">
            <div className="font-semibold mb-1">Debug Info:</div>
            <div>Total Requests: {requests.length}</div>
            <div>Pending: {pendingRequests.length}</div>
            <div>Recent: {recentRequests.length}</div>
            <div>Other: {otherRequests.length}</div>
          </div>
        )}

        {/* Main Content - Split Layout */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Left Column - Pending Requests (5 max) */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-md border border-gray-200 p-3 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <h2 className="text-sm font-semibold text-gray-800">Pending Approval</h2>
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-yellow-600 rounded-full">
                    {pendingRequests.length}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    activeTab === "pending" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1.5"></div>
                    <p className="text-gray-600 text-xs">Loading...</p>
                  </div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-1">All caught up!</h3>
                  <p className="text-gray-600 text-xs">No pending requests found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {pendingRequests.slice(0, 5).map((request) => (
                    <div
                      key={request._id}
                      onClick={() => handleViewDetails(request)}
                      className="bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 p-2 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getRequestTypeColor(request)}`}></div>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            Pending
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">
                          {getRequestDates(request)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {request.employeeName || "Unknown"}
                          </h3>
                          <p className="text-xs text-gray-600">ID: {request.employeeId || "N/A"}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {getRequestDuration(request)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="capitalize">
                          {isLeaveRequest(request) ? request.leaveType : request.permissionType}
                        </span>
                        <span>{formatShortDate(request.createdAt)}</span>
                      </div>

                      {request.description && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                          <p className="text-xs text-gray-600 line-clamp-1">{request.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recent Requests (5 max) */}
          <div className="lg:w-1/2">
            <div className="bg-white rounded-md border border-gray-200 p-3 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-800">Recent Actions</h2>
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {recentRequests.length}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("recent")}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    activeTab === "recent" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1.5"></div>
                    <p className="text-gray-600 text-xs">Loading...</p>
                  </div>
                </div>
              ) : recentRequests.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-1">No recent actions</h3>
                  <p className="text-gray-600 text-xs">Approved/rejected requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {recentRequests.slice(0, 5).map((request) => (
                    <div
                      key={request._id}
                      onClick={() => handleViewDetails(request)}
                      className="bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 p-2 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getRequestTypeColor(request)}`}></div>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status.replace('-', ' ')}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">
                          {getRequestDates(request)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {request.employeeName || "Unknown"}
                          </h3>
                          <p className="text-xs text-gray-600">ID: {request.employeeId || "N/A"}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {getRequestDuration(request)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="capitalize">
                          {isLeaveRequest(request) ? request.leaveType : request.permissionType}
                        </span>
                        <span>{formatShortDate(request.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Requests Section - Scrollable */}
        {otherRequests.length > 0 && (
          <div className="mt-3">
            <div className="bg-white rounded-md border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                  Other Requests ({otherRequests.length})
                </h2>
              </div>

              <div 
                ref={otherRequestsRef}
                className="overflow-x-auto max-h-[250px]"
              >
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-700">Employee</th>
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-700">Type</th>
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-700">Dates</th>
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-700">Duration</th>
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-700">Requested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {otherRequests.map((request) => (
                      <tr 
                        key={request._id} 
                        onClick={() => handleViewDetails(request)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="py-1.5 px-2">
                          <div className="font-medium text-gray-900 truncate max-w-[100px]">{request.employeeName}</div>
                          <div className="text-gray-600 truncate max-w-[100px]">{request.employeeId}</div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getRequestTypeColor(request)}`}></div>
                            <div>
                              <div className="font-medium text-gray-900 capitalize text-xs">
                                {isLeaveRequest(request) ? request.leaveType : request.permissionType}
                              </div>
                              <div className="text-gray-600 text-xs capitalize">
                                {request.requestType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="text-gray-900 font-medium">
                            {getRequestDates(request)}
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-medium text-gray-900">
                            {getRequestDuration(request)}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 w-fit ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status === "pending" ? "Pending" : 
                             request.status === "manager-pending" ? "Manager" :
                             request.status === "auto-approved" ? "Auto" : 
                             request.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-gray-600">
                          {formatShortDate(request.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-md w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Request Details</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Header Info */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${getRequestTypeColor(selectedRequest)}`}>
                    {getRequestTypeIcon(selectedRequest)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm capitalize">
                      {isLeaveRequest(selectedRequest) 
                        ? `${selectedRequest.leaveType} Leave`
                        : `${selectedRequest.permissionType} Permission`}
                    </h4>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 mt-0.5 w-fit ${getStatusColor(selectedRequest.status)}`}>
                      {getStatusIcon(selectedRequest.status)}
                      {selectedRequest.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="bg-gray-50 rounded p-2">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Employee Information</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="font-medium text-gray-900 text-sm">{selectedRequest.employeeName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Employee ID</p>
                      <p className="font-medium text-gray-900 text-sm">{selectedRequest.employeeId}</p>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-gray-50 rounded p-2">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Request Details</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-600">Dates</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {getRequestDates(selectedRequest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {getRequestDuration(selectedRequest)}
                      </p>
                    </div>
                    {isPermissionRequest(selectedRequest) && selectedRequest.startTime && (
                      <div>
                        <p className="text-xs text-gray-600">Start Time</p>
                        <p className="font-medium text-gray-900 text-sm">{selectedRequest.startTime}</p>
                      </div>
                    )}
                    {isPermissionRequest(selectedRequest) && selectedRequest.endTime && (
                      <div>
                        <p className="text-xs text-gray-600">End Time</p>
                        <p className="font-medium text-gray-900 text-sm">{selectedRequest.endTime}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <div className="bg-gray-50 rounded p-2">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Description</h5>
                    <p className="text-gray-700 text-sm">{selectedRequest.description}</p>
                  </div>
                )}

                {/* Forgot Reason (for forgot-check) */}
                {isPermissionRequest(selectedRequest) && selectedRequest.forgotReason && (
                  <div className="bg-yellow-50 rounded p-2 border border-yellow-200">
                    <h5 className="text-xs font-medium text-yellow-700 mb-1">Forgot Reason</h5>
                    <p className="text-yellow-800 text-sm">{selectedRequest.forgotReason}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="border-t pt-2">
                  <div className="text-xs text-gray-600">
                    Requested: {formatDateTime(selectedRequest.createdAt)}
                  </div>
                </div>

                {/* Actions (only for pending) */}
                {selectedRequest.status === "pending" && (
                  <div className="flex items-center justify-end gap-1.5 pt-3 border-t">
                    <button
                      onClick={() => {
                        handleReject(selectedRequest._id);
                        setSelectedRequest(null);
                      }}
                      disabled={isUpdating === selectedRequest._id}
                      className={`px-2.5 py-1 rounded font-medium text-xs transition-colors flex items-center gap-1 ${
                        isUpdating === selectedRequest._id
                          ? "bg-gray-100 text-gray-400"
                          : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                      }`}
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(selectedRequest._id);
                        setSelectedRequest(null);
                      }}
                      disabled={isUpdating === selectedRequest._id}
                      className={`px-2.5 py-1 rounded font-medium text-xs transition-colors flex items-center gap-1 ${
                        isUpdating === selectedRequest._id
                          ? "bg-gray-100 text-gray-400"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;