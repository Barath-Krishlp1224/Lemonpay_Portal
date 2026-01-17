"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, X, AlertCircle, Check } from "lucide-react";
import { Employee, SavedProject } from "../../types/project";

interface ProjectCreationModalProps {
  show: boolean;
  onClose: () => void;
  employees: Employee[];
  editingProject: SavedProject | null;
  onProjectCreated: () => void;
  onProjectUpdated: () => void;
  existingProjects: SavedProject[];
}

export default function ProjectCreationModal({
  show,
  onClose,
  employees,
  editingProject,
  onProjectCreated,
  onProjectUpdated,
  existingProjects
}: ProjectCreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [editingKey, setEditingKey] = useState(false);

  const [projectFormData, setProjectFormData] = useState({
    name: "",
    key: "",
    ownerId: "",
    assigneeIds: [] as string[],
    description: "",
  });

  // Initialize form when editing project changes
  useEffect(() => {
    if (editingProject) {
      setProjectFormData({
        name: editingProject.name,
        key: editingProject.key,
        ownerId: editingProject.ownerId,
        assigneeIds: editingProject.assigneeIds || [],
        description: editingProject.description || "",
      });
      setEditingKey(false);
    } else {
      setProjectFormData({
        name: "",
        key: "",
        ownerId: "",
        assigneeIds: [],
        description: "",
      });
    }
  }, [editingProject]);

  // Auto-generate project key for new projects
  useEffect(() => {
    if (!editingProject && !editingKey && projectFormData.name) {
      const generatedKey = projectFormData.name
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5);
      
      const finalKey = generatedKey.length >= 2 
        ? generatedKey 
        : (projectFormData.name.substring(0, 5).replace(/\s/g, '') + "1").toUpperCase();
      
      setProjectFormData(prev => ({ ...prev, key: finalKey }));
    }
  }, [projectFormData.name, editingKey, editingProject]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setProjectFormData({ ...projectFormData, name: newName });

    if (!newName.trim()) {
      setNameError("");
      return;
    }

    // Check for duplicate names (excluding current project if editing)
    const isDuplicate = existingProjects.some(
      (p) => p.name.toLowerCase() === newName.trim().toLowerCase() && 
             (!editingProject || p._id !== editingProject._id)
    );

    if (isDuplicate) {
      setNameError("This project name is already taken");
    } else {
      setNameError("");
    }
  };

  const handleProjectSubmit = async () => {
    if (nameError || !projectFormData.name.trim()) return;

    setLoading(true);
    setMessage("");
    
    try {
      const requestData = {
        name: projectFormData.name.trim(),
        key: projectFormData.key.toUpperCase(),
        ownerId: "", // Empty string for owner
        assigneeIds: [], // Empty array for assignees
        description: projectFormData.description,
      };

      console.log("Submitting project data:", requestData);
      console.log("Editing project:", editingProject);

      let url = "/api/projects";
      let method = "POST";

      if (editingProject) {
        url = `/api/projects/${editingProject._id}`;
        method = "PUT";
      }

      console.log(`Making ${method} request to: ${url}`);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      console.log("Response status:", response.status);
      console.log("Response data:", responseData);

      if (response.ok) {
        const successMessage = `✅ Project ${editingProject ? "updated" : "created"} successfully!`;
        setMessage(successMessage);
        
        // Clear form and close modal after successful operation
        setTimeout(() => {
          if (editingProject) {
            onProjectUpdated();
          } else {
            onProjectCreated();
          }
          onClose();
        }, 1500);
      } else {
        // Handle specific error messages
        const errorMessage = responseData.error || 
                           responseData.message || 
                           `Failed to ${editingProject ? "update" : "create"} project`;
        setMessage(`❌ ${errorMessage}`);
      }
    } catch (err: any) {
      console.error("Network error:", err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full mt-20 max-h-[70vh] overflow-hidden flex flex-col border-4 border-white">
        <div className="p-8 lg:p-12 flex-1 overflow-y-auto custom-scrollbar">
          <header className="mb-10 flex items-center justify-between">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {editingProject ? "Edit Project" : "Create Project"}
            </h1>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
              disabled={loading}
            >
              <X size={20} className="text-slate-400" />
            </button>
          </header>

          {message && (
            <div className={`mb-6 p-4 rounded-2xl text-xs flex items-center gap-2 font-bold ${
              message.includes("✅") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {message.includes("✅") ? (
                <CheckCircle2 size={16} className="text-green-600" />
              ) : (
                <AlertCircle size={16} className="text-red-600" />
              )}
              <span>{message.replace("✅", "").replace("❌", "").trim()}</span>
            </div>
          )}

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Project Name *</label>
              <input
                className={`w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#3fa87d] focus:bg-white font-bold text-slate-900 transition-all ${
                  nameError ? "border-red-400 focus:border-red-400" : ""
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                placeholder="e.g. Apollo Phase 2"
                value={projectFormData.name}
                onChange={handleNameChange}
                disabled={loading}
              />
              {nameError && (
                <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                  <AlertCircle size={12} /> 
                  {nameError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Project ID *</label>
                <button 
                  onClick={() => setEditingKey(!editingKey)} 
                  className="text-[10px] font-bold text-[#3fa87d] uppercase tracking-wider hover:text-[#35946d] transition-colors"
                  disabled={loading}
                >
                  {editingKey ? "Save Key" : "Edit Key"}
                </button>
              </div>
              <input
                type="text"
                className={`w-full px-6 py-4 border-2 rounded-2xl outline-none font-bold uppercase transition-all ${
                  !editingKey 
                    ? "bg-slate-100 text-slate-400 border-slate-100" 
                    : "bg-slate-50 focus:border-[#3fa87d] focus:bg-white border-slate-100"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                value={projectFormData.key}
                readOnly={!editingKey}
                onChange={(e) => setProjectFormData({
                  ...projectFormData, 
                  key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                })}
                maxLength={10}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Description</label>
              <textarea
                className={`w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#3fa87d] focus:bg-white font-bold text-slate-900 transition-all min-h-[100px] ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                placeholder="Project description (optional)"
                value={projectFormData.description}
                onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
          <button
            onClick={onClose}
            className={`px-6 py-4 bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-2xl hover:bg-slate-300 transition-all ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleProjectSubmit}
            disabled={loading || !!nameError || !projectFormData.name.trim()}
            className="px-12 py-4 bg-slate-900 text-white text-xs font-black uppercase rounded-2xl shadow-xl hover:bg-[#3fa87d] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : editingProject ? "Update Project" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}