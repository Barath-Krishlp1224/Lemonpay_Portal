"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  TrendingUp,
  History,
  ShieldCheck,
  Building,
  Users,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

type LeaveType = "sick" | "casual" | "planned" | "unplanned" | "";
type PermissionType = "permission" | "wfh" | "on-duty" | "forgot-check" | "";
type RequestStatus = "pending" | "manager-pending" | "approved" | "rejected" | "auto-approved";

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

// Type guard functions
const isLeaveRequest = (request: Request): request is LeaveRequest => {
  return request.requestType === "leave";
};

const isPermissionRequest = (request: Request): request is PermissionRequest => {
  return request.requestType === "permission";
};

const ManagerApprovalPage: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState<LeaveType>("");
  const [filterPermissionType, setFilterPermissionType] = useState<PermissionType>("");
  const [filterRequestType, setFilterRequestType] = useState<"all" | "leave" | "permission">("all");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchManagerPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔍 Fetching manager pending requests...");
      
      // Fetch both leaves and permissions with manager-pending status
      const [leavesRes, permissionsRes] = await Promise.all([
        fetch(`/api/leaves?status=manager-pending`),
        fetch(`/api/permissions?status=manager-pending`)
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

      console.log("✅ Processed leaves:", leaves.length);
      console.log("✅ Processed permissions:", permissions.length);
      
      setRequests([...leaves, ...permissions]);
      
    } catch (error) {
      console.error("❌ Failed to fetch manager pending requests:", error);
      setError("Failed to load requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerPending();
  }, [fetchManagerPending]);

  const handleClearFilter = () => {
    setFilterEmployee("");
    setFilterLeaveType("");
    setFilterPermissionType("");
    setFilterRequestType("all");
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
      case "manager-pending":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "approved":
        return "bg-green-100 text-green-800 border border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "auto-approved":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case "manager-pending":
        return <ShieldCheck className="w-3 h-3" />;
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      case "pending":
        return <Clock className="w-3 h-3" />;
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

      console.log("🔄 Manager updating request:", {
        id,
        requestType: request.requestType,
        currentStatus: request.status,
        newStatus
      });

      // Determine the correct endpoint based on request type
      const endpoint = isLeaveRequest(request) 
        ? `/api/leaves/${id}/status` 
        : `/api/permissions/${id}/status`;
      
      const bodyData = { 
        status: newStatus,
        notes: `Manager ${newStatus === 'approved' ? 'approved' : 'rejected'} the request`
      };

      console.log("📤 Sending to endpoint:", endpoint);
      console.log("📦 Request body:", bodyData);

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      const responseData = await res.json();
      console.log("📥 Response status:", res.status);
      console.log("📥 Response data:", responseData);

      if (res.ok) {
        // Remove the request from the list since it's no longer manager-pending
        setRequests(prev => prev.filter(req => req._id !== id));
        
        // Trigger refresh for employee dashboard
        window.dispatchEvent(new Event('request-updated'));
        
        alert(`Request ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully!`);
        
        // Refresh the list
        fetchManagerPending();
      } else {
        setError(`Failed to update request: ${responseData.error || "Server error"}`);
        alert(`Failed to update request: ${responseData.error || "Server error"}`);
        fetchManagerPending();
      }
    } catch (error) {
      console.error(`❌ Error updating request ${id}:`, error);
      setError("Network error occurred while trying to update the request.");
      alert(`Network error occurred while trying to update the request.`);
      fetchManagerPending();
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

    console.log("✅ Manager approving request:", {
      id,
      requestType: request.requestType,
      currentStatus: request.status
    });

    if (request.status !== "manager-pending") {
      alert("This request is not pending manager approval.");
      return;
    }

    updateRequestStatus(id, "approved");
  };

  const handleReject = (id: string) => {
    const request = requests.find((r) => r._id === id);
    if (!request) {
      setError("Request not found");
      return;
    }

    console.log("❌ Manager rejecting request:", {
      id,
      requestType: request.requestType,
      currentStatus: request.status
    });

    if (request.status !== "manager-pending") {
      alert("This request is not pending manager approval.");
      return;
    }

    updateRequestStatus(id, "rejected");
  };

  const handleDeleteRequest = async (id: string) => {
    const request = requests.find((r) => r._id === id);
    if (!request) {
      setError("Request not found");
      return;
    }

    if (!confirm("Are you sure you want to delete this request?")) return;

    setIsUpdating(id);
    try {
      const endpoint = isLeaveRequest(request) 
        ? `/api/leaves/${id}` 
        : `/api/permissions/${id}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from local state
        setRequests(prev => prev.filter(req => req._id !== id));
        

        
        // Trigger refresh for employee dashboard
        window.dispatchEvent(new Event('request-updated'));
        
        alert("Request deleted successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete request");
      }
    } catch (error) {
      console.error('❌ Error deleting request:', error);
      alert("An error occurred while deleting the request");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
  };

  const handleViewFullHistory = () => {
    router.push("/components/emp-leave/full");
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

  // Filter requests
  const filteredRequests = requests.filter(request => {
    if (filterEmployee && !request.employeeName?.toLowerCase().includes(filterEmployee.toLowerCase()) && 
        !request.employeeId?.toLowerCase().includes(filterEmployee.toLowerCase())) {
      return false;
    }
    if (filterRequestType !== "all" && request.requestType !== filterRequestType) {
      return false;
    }
    if (filterLeaveType && isLeaveRequest(request) && request.leaveType !== filterLeaveType) {
      return false;
    }
    if (filterPermissionType && isPermissionRequest(request) && request.permissionType !== filterPermissionType) {
      return false;
    }
    return true;
  });

  const isFilterActive = filterEmployee || filterLeaveType || filterPermissionType || filterRequestType !== "all";

  // Calculate stats
  const leaveRequestsCount = filteredRequests.filter(r => isLeaveRequest(r)).length;
  const permissionRequestsCount = filteredRequests.filter(r => isPermissionRequest(r)).length;
  const averageDays = filteredRequests.length > 0 
    ? (filteredRequests.reduce((acc, req) => acc + (isLeaveRequest(req) ? req.days : (req.days || 0)), 0) / filteredRequests.length).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg md:text-xl font-bold text-gray-800">Manager Approval</h1>
              </div>
              <p className="text-gray-600 text-xs md:text-sm">
                These requests have been approved by Team Leads and await your final approval.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {error && (
                <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  {error}
                </div>
              )}
              <button
                onClick={fetchManagerPending}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={handleViewFullHistory}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
              >
                <History className="w-3 h-3" />
                Full History
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Employee Filter */}
              <div className="lg:col-span-2">
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
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    placeholder="Search by name or ID..."
                    className="w-full pl-7 pr-7 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-black placeholder-gray-600"
                  />
                  {filterEmployee && (
                    <button
                      onClick={() => setFilterEmployee("")}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center"
                    >
                      <X className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                    </button>
                  )}
                </div>
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
            </div>
          </div>
        </div>

        {/* Main Content - Manager Pending Requests */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Pending Manager Approval
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {filteredRequests.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-md border border-gray-200 p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1.5"></div>
                <p className="text-gray-600 text-xs">Loading requests...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-md border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-base font-medium text-gray-800 mb-1">All caught up!</h3>
              <p className="text-gray-600 text-xs">
                No requests pending manager approval{isFilterActive ? " for current filters" : ""}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredRequests.map((request) => (
                <div
                  key={request._id}
                  onClick={() => handleViewDetails(request)}
                  className="bg-white rounded-md border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getRequestTypeColor(request)}`}></div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        Manager Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(request._id);
                        }}
                        disabled={isUpdating === request._id}
                        className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                        title="Delete request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(request);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-0.5"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {request.employeeName || "Unknown"}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">ID: {request.employeeId || "N/A"}</p>
                  </div>

                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Dates:</span>
                      <span className="text-xs font-medium text-gray-900">
                        {getRequestDates(request)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Duration:</span>
                      <span className="text-xs font-medium text-gray-900">
                        {getRequestDuration(request)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span className="capitalize">
                      {isLeaveRequest(request) ? request.leaveType : request.permissionType}
                    </span>
                    <span>{formatShortDate(request.createdAt)}</span>
                  </div>

                  {request.description && (
                    <div className="pt-1.5 border-t border-gray-100 mb-2">
                      <p className="text-xs text-gray-600 line-clamp-1">{request.description}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {formatShortDate(request.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(request._id);
                        }}
                        disabled={isUpdating === request._id}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-0.5 ${
                          isUpdating === request._id
                            ? "bg-gray-100 text-gray-400"
                            : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        }`}
                        title="Reject"
                      >
                        {isUpdating === request._id ? (
                          <>...</>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(request._id);
                        }}
                        disabled={isUpdating === request._id}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-0.5 ${
                          isUpdating === request._id
                            ? "bg-gray-100 text-gray-400"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                        title="Approve"
                      >
                        {isUpdating === request._id ? (
                          <>...</>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {filteredRequests.length > 0 && (
          <div className="mt-3">
            <div className="bg-white rounded-md border border-gray-200 p-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="bg-blue-50 rounded p-2">
                  <p className="text-xs text-gray-600">Total Pending</p>
                  <p className="text-lg font-bold text-blue-700">{filteredRequests.length}</p>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <p className="text-xs text-gray-600">Leave Requests</p>
                  <p className="text-lg font-bold text-green-700">
                    {leaveRequestsCount}
                  </p>
                </div>
                <div className="bg-purple-50 rounded p-2">
                  <p className="text-xs text-gray-600">Permission Requests</p>
                  <p className="text-lg font-bold text-purple-700">
                    {permissionRequestsCount}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded p-2">
                  <p className="text-xs text-gray-600">Avg. Duration</p>
                  <p className="text-lg font-bold text-yellow-700">
                    {averageDays}d
                  </p>
                </div>
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
                      Manager Pending
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
                  <div className="text-xs text-gray-600 mt-1">
                    Status: Awaiting Manager Approval
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-3 border-t">
                  <button
                    onClick={() => {
                      handleDeleteRequest(selectedRequest._id);
                      setSelectedRequest(null);
                    }}
                    disabled={isUpdating === selectedRequest._id}
                    className={`px-2.5 py-1 rounded font-medium text-xs transition-colors flex items-center gap-1 ${
                      isUpdating === selectedRequest._id
                        ? "bg-gray-100 text-gray-400"
                        : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                  <div className="flex gap-1.5">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerApprovalPage;