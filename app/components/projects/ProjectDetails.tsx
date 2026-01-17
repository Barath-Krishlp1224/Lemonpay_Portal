"use client";

import React, { useState, useEffect } from "react";
import { Layers, ListTodo, FolderKanban } from "lucide-react";
import { SavedProject } from "../../types/project";

interface Epic {
  _id: string;
  epicId: string;
  name: string;
  projectId: string;
}

interface Task {
  _id: string;
  name: string;
  projectId: string;
}

interface ProjectDetailsProps {
  selectedProject: SavedProject | null;
  onProjectUpdate: () => void;
}

export default function ProjectDetails({ selectedProject, onProjectUpdate }: ProjectDetailsProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEpics = async (projectId: string) => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/epics?projectId=${projectId}`);
      const data = await response.json();
      if (response.ok) {
        setEpics(data);
      }
    } catch (err) {
      console.error("Failed to fetch epics:", err);
    }
  };

  const fetchTasks = async (projectId: string) => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      const data = await response.json();
      
      let tasksArray: Task[] = [];
      if (data.success && Array.isArray(data.data)) {
        tasksArray = data.data;
      } else if (Array.isArray(data)) {
        tasksArray = data;
      }
      
      setTasks(tasksArray);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setTasks([]);
    }
  };

  const fetchProjectData = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchEpics(selectedProject._id),
        fetchTasks(selectedProject._id)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchProjectData();
    } else {
      setEpics([]);
      setTasks([]);
    }
  }, [selectedProject]);

  if (!selectedProject) {
    return (
      <div className="flex flex-col">
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <FolderKanban className="text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold mb-2">Select a project to view details</p>
            <p className="text-slate-400 text-sm text-center">Click on any project from the list</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Project Details</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3fa87d]"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Project Header */}
              <div className="text-center">
                <div className="w-20 h-20 bg-[#3fa87d] rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md mx-auto mb-4">
                  {selectedProject.key.substring(0, 2)}
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">{selectedProject.name}</h3>
                <p className="text-slate-600">ID: {selectedProject.key}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Created: {new Date(selectedProject.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Stats Section */}
              <div className="space-y-6">
                {/* Epics Count */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Layers className="text-blue-600" size={24} />
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-black text-slate-900">{epics.length}</div>
                      <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">Epics</div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-slate-600">
                    Total number of epics in this project
                  </div>
                </div>

                {/* Tasks Count */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <ListTodo className="text-green-600" size={24} />
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-black text-slate-900">{tasks.length}</div>
                      <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">Tasks</div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-slate-600">
                    Total number of tasks in this project
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="text-center">
                <p className="text-slate-600">
                  This project contains <span className="font-bold text-slate-800">{epics.length} epics</span> 
                  {" "}and <span className="font-bold text-slate-800">{tasks.length} tasks</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}