"use client";

import React, { useState, useEffect } from 'react';
import SprintManagement from './SprintManagement'; // Adjust path as needed
import type { SavedProject, Employee } from '@/app/types/project';

const SprintManagementPage = () => {
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects and employees on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch projects
        const projectsRes = await fetch('/api/projects');
        const projectsData = await projectsRes.json();
        setProjects(Array.isArray(projectsData) ? projectsData : (projectsData.projects || []));

        // Fetch employees
        const employeesRes = await fetch('/api/employees');
        const employeesData = await employeesRes.json();
        const rawEmployees = employeesData.success && Array.isArray(employeesData.employees) 
          ? employeesData.employees 
          : [];
        
        setEmployees(rawEmployees.map((e: any) => ({
          _id: e._id,
          name: e.name || e.displayName || "Unknown",
          department: e.department || e.team || "Staff",
          email: e.email || "",
          avatar: e.avatar || "",
          role: e.role || "Developer" // Make sure role is included
        })));

        // Optionally select the first project by default
        if (projectsData.length > 0) {
          setSelectedProject(projectsData[0]);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProjectSelect = (project: SavedProject) => {
    setSelectedProject(project);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          {/* Header centered */}
          <header className="mb-8 max-w-3xl">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Sprint Management</h1>
            <p className="text-slate-600">Manage sprints, tasks, and team assignments across projects</p>
          </header>

          {/* Sprint Management Component - Centered */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-6xl">
              <SprintManagement 
                selectedProject={selectedProject}
                employees={employees}
                projects={projects}
                onProjectSelect={handleProjectSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintManagementPage;