"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  LogIn,
  LogOut,
  CheckCircle2,
  RotateCcw,
  Camera,
  MapPin,
  UserCheck,
  Activity,
  CalendarDays,
  TrendingUp,
  Target,
  Clock,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const TOTAL_WORK_DAYS = 320;
const TOTAL_LIMIT = 12;

type PunchType = "IN" | "OUT";

const BRANCHES = [
  { id: "saaram", name: "LP-Saaram Pondy", lat: 11.939198361614558, lon: 79.81654494108358, radius: 150 },
  { id: "tidel", name: "LP-Tidel Villupuram", lat: 11.995967441546023, lon: 79.7674479892814, radius: 2000 }
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// FIXED: Improved time formatting to handle ISO strings and existing time strings
const formatTime = (timeStr?: string) => {
  if (!timeStr) return "--:--";
  try {
    const date = new Date(timeStr);
    // If the string isn't a valid date (like "09:30 AM"), return the string itself
    if (isNaN(date.getTime())) return timeStr; 
    
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return timeStr || "--:--";
  }
};

const formatDateTime = (timeStr?: string) => {
  if (!timeStr) return "--:-- --";
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return timeStr || "--:-- --";
  }
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
};

type FilterType = "lastDay" | "lastWeek" | "lastMonth" | "custom" | "all";

const AttendancePage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [record, setRecord] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [punchType, setPunchType] = useState<PunchType | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [location, setLocation] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [empIdOrEmail, setEmpIdOrEmail] = useState("");
  const [employeeName, setEmployeeName] = useState("Loading...");
  const [leaveSummary, setLeaveSummary] = useState({ sick: 12, casual: 12, plannedRequests: 0, unplannedRequests: 0 });
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sickTaken, setSickTaken] = useState(0);
  const [casualTaken, setCasualTaken] = useState(0);

  const refreshData = async (id: string) => {
    if (!id) return;
    try {
      const todayRes = await fetch("/api/attendance/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: id }),
      });
      const todayJson = await todayRes.json();
      // Ensure we map punchInTime/punchOutTime correctly from the record
      setRecord(todayJson.record || null);

      const attendanceRes = await fetch(`/api/attendance?empId=${encodeURIComponent(id)}`);
      if (attendanceRes.ok) {
        const attData = await attendanceRes.json();
        setAttendanceHistory(attData.attendances || []);
      }

      const balanceRes = await fetch(`/api/leaves?empIdOrEmail=${encodeURIComponent(id)}`);
      if (balanceRes.ok) {
        const leaveData = await balanceRes.json();
        setLeaveSummary(leaveData);
        setSickTaken(TOTAL_LIMIT - leaveData.sick);
        setCasualTaken(TOTAL_LIMIT - leaveData.casual);
      }

      const historyRes = await fetch(`/api/leaves?empIdOrEmail=${encodeURIComponent(id)}&mode=list`);
      const historyData = await historyRes.json();
      if (Array.isArray(historyData)) setUserRequests(historyData);

    } catch (error) {
      console.error("Data loading error:", error);
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem("userEmpId");
    const name = localStorage.getItem("userName");
    if (id) {
      setEmpIdOrEmail(id);
      setEmployeeName(name || id);
      refreshData(id);
    }
  }, []);

  useEffect(() => {
    if (record?.punchInTime && !record.punchOutTime) {
      setPunchType("OUT");
    } else if (record?.punchInTime && record.punchOutTime) {
      setPunchType(null);
    } else {
      setPunchType("IN");
    }
  }, [record]);

  useEffect(() => {
    if (record?.punchInTime && record.punchOutTime) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraReady(true);
          };
        }
      } catch (e) {
        setSubmitStatus("Camera access denied.");
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [record]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error("Geo Error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !empIdOrEmail) return;

    if (location.lat && location.lng) {
      const distance = getDistance(location.lat, location.lng, selectedBranch.lat, selectedBranch.lon);
      if (distance > selectedBranch.radius) {
        setSubmitStatus(`❌ Failed: Outside branch area (${Math.round(distance)}m).`);
        return;
      }
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      setPreviewImage(canvas.toDataURL("image/jpeg", 0.8));
      setIsConfirming(true);
      setSubmitStatus(null);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empIdOrEmail?.trim(),
          employeeName: employeeName,
          imageData: previewImage,
          latitude: location.lat,
          longitude: location.lng,
          punchType,
          branch: selectedBranch.name
        }),
      });

      if (res.ok) {
        setSubmitStatus(`Success! Recorded ✅`);
        if (empIdOrEmail) refreshData(empIdOrEmail);
        setIsConfirming(false);
        setPreviewImage(null);
      } else {
        const errorData = await res.json();
        setSubmitStatus(errorData.error || "Submission failed.");
      }
    } catch (e) {
      setSubmitStatus("System error.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredAttendance = useMemo(() => {
    let filtered = attendanceHistory;
    const now = new Date();

    switch (selectedFilter) {
      case "lastDay":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = attendanceHistory.filter(att => new Date(att.date) >= yesterday);
        break;
      case "lastWeek":
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        filtered = attendanceHistory.filter(att => new Date(att.date) >= lastWeek);
        break;
      case "lastMonth":
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        filtered = attendanceHistory.filter(att => new Date(att.date) >= lastMonth);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          filtered = attendanceHistory.filter(att => {
            const attDate = new Date(att.date);
            return attDate >= start && attDate <= end;
          });
        }
        break;
      default:
        break;
    }

    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceHistory, selectedFilter, customStartDate, customEndDate]);

  const annualStats = useMemo(() => {
    const presentCount = attendanceHistory.filter(a => a.present).length;
    const totalApproved = userRequests
      .filter(req => req.status === 'approved' || req.status === 'auto-approved')
      .reduce((acc, req) => acc + req.days, 0);

    return {
      totalTaken: totalApproved,
      presentCount,
      sickTaken,
      casualTaken,
      attendanceProgress: (presentCount / TOTAL_WORK_DAYS) * 100,
      leaveImpact: (totalApproved / TOTAL_WORK_DAYS) * 100,
      sickProgress: (sickTaken / TOTAL_LIMIT) * 100,
      casualProgress: (casualTaken / TOTAL_LIMIT) * 100
    };
  }, [leaveSummary, userRequests, attendanceHistory, sickTaken, casualTaken]);

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setSelectedFilter("custom");
      setShowCustomDatePicker(false);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);
    if (filter !== "custom") {
      setShowCustomDatePicker(false);
    } else {
      setShowCustomDatePicker(true);
    }
  };

  const isShiftComplete = !!(record?.punchInTime && record?.punchOutTime);

  if (!empIdOrEmail) return <div className="p-20 text-center font-bold text-black italic">Loading Attendance System...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-black">
      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Confirm Punch</h2>
            </div>
            {previewImage && <img src={previewImage} className="w-full h-48 object-cover rounded-2xl mb-6 shadow-md" alt="Captured" />}
            <div className="space-y-3">
              <button onClick={handleConfirmSubmit} disabled={submitLoading} className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-all">
                {submitLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : 'Confirm & Submit'}
              </button>
              <button onClick={() => { setIsConfirming(false); setPreviewImage(null); }} disabled={submitLoading} className="w-full py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                Retake
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mt-20"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col min-h-[500px]">
              {isShiftComplete ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center bg-green-50/50 rounded-[1.5rem] border-2 border-dashed border-green-100 p-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-black text-green-900">SHIFT COMPLETE</h2>
                  <p className="text-green-700 mt-2 font-medium">Both punches recorded for today.</p>
                  <button onClick={() => window.location.reload()} className="mt-8 flex items-center gap-2 text-green-700 font-bold hover:bg-white px-5 py-2 rounded-full border border-green-200 transition-all">
                    <RotateCcw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                       <h2 className="text-lg font-bold">Mark Today's Attendance</h2>
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                          <MapPin className="w-3 h-3" /> GPS ON
                       </div>
                    </div>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                      value={selectedBranch.id}
                      onChange={(e) => setSelectedBranch(BRANCHES.find(b => b.id === e.target.value) || BRANCHES[0])}
                    >
                      {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                    <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline />
                    <div className="absolute inset-0 border-[30px] border-black/10 pointer-events-none" />
                  </div>

                  <div className="mt-6">
                    <button 
                      onClick={handleCapture} 
                      disabled={!isCameraReady || submitLoading} 
                      className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${punchType === 'IN' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-red-600 text-white hover:bg-red-700'} disabled:opacity-50`}
                    >
                      <Camera className="w-6 h-6" />
                      {punchType === 'IN' ? 'CHECK IN NOW' : 'CHECK OUT NOW'}
                    </button>
                    {submitStatus && (
                      <div className={`mt-4 p-3 rounded-xl text-xs font-bold text-center border ${submitStatus.includes('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {submitStatus}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <LogIn className="w-4 h-4 text-blue-600" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punch In</p>
                    </div>
                    {/* FIXED: Directly displaying record time if available */}
                    <p className="text-xl font-black text-slate-900">{formatTime(record?.punchInTime)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <LogOut className="w-4 h-4 text-red-600" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punch Out</p>
                    </div>
                    {/* FIXED: Directly displaying record time if available */}
                    <p className="text-xl font-black text-slate-900">{formatTime(record?.punchOutTime)}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900">Presence & Leave Analytics</h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatBox icon={<UserCheck className="text-blue-600" />} label="Presence" val={annualStats.presentCount} sub={`/ ${TOTAL_WORK_DAYS}`} progress={annualStats.attendanceProgress} color="bg-blue-600" />
                  <SickCasualStatBox icon={<Activity className="text-indigo-600" />} label="Sick" remaining={leaveSummary.sick} taken={sickTaken} total={TOTAL_LIMIT} showLoader={sickTaken > 0} color="bg-indigo-600" />
                  <SickCasualStatBox icon={<CalendarDays className="text-purple-600" />} label="Casual" remaining={leaveSummary.casual} taken={casualTaken} total={TOTAL_LIMIT} showLoader={casualTaken > 0} color="bg-purple-600" />
                  <StatBox icon={<TrendingUp className="text-red-600" />} label="Total Taken" val={annualStats.totalTaken} sub="All Leaves" progress={annualStats.leaveImpact} color="bg-red-600" />
                  <StatBox icon={<Target className="text-orange-600" />} label="Impact" val={annualStats.totalTaken} sub={`/ ${TOTAL_WORK_DAYS}`} progress={annualStats.leaveImpact} color="bg-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
                  <h2 className="font-bold text-lg text-slate-900">Attendance History</h2>
                </div>
                <div className="flex items-center gap-3 relative">
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select className="text-sm font-bold outline-none bg-transparent cursor-pointer min-w-[120px]" value={selectedFilter} onChange={(e) => handleFilterChange(e.target.value as FilterType)}>
                      <option value="all">All Records</option>
                      <option value="lastDay">Last Day</option>
                      <option value="lastWeek">Last Week</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {showCustomDatePicker && (
                    <div className="absolute right-0 top-12 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-4 w-72">
                      <div className="space-y-3">
                        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                        <div className="flex gap-2 pt-2">
                          <button onClick={handleCustomDateApply} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm">Apply</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[11px] uppercase text-slate-400 font-black tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[11px] uppercase text-slate-400 font-black tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[11px] uppercase text-slate-400 font-black tracking-widest text-center">Punch In</th>
                      <th className="px-6 py-4 text-[11px] uppercase text-slate-400 font-black tracking-widest text-center">Punch Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAttendance.map((att, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{formatDate(att.date)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${att.present ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {att.present ? "PRESENT" : "ABSENT"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                              <LogIn className="w-3 h-3 text-blue-500" />
                              <span className="text-sm font-bold text-blue-600">{formatDateTime(att.punchInTime)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                              <LogOut className="w-3 h-3 text-red-500" />
                              <span className="text-sm font-bold text-red-600">{formatDateTime(att.punchOutTime)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

// UI Components
const StatBox = ({ icon, label, val, sub, progress, color }: any) => (
  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">{icon}</div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-black text-slate-900">{val}</h3>
      <p className="text-[10px] text-slate-600 font-medium uppercase">{sub}</p>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  </div>
);

const SickCasualStatBox = ({ icon, label, remaining, taken, total, showLoader, color }: any) => (
  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">{icon}</div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-black text-slate-900">{remaining}</h3>
      <p className="text-[10px] text-slate-600 font-medium uppercase">Taken: {taken}</p>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${(taken / total) * 100}%` }} />
      </div>
    </div>
  </div>
);

export default AttendancePage;