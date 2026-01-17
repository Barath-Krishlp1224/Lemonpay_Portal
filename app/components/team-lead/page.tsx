"use client";

import React, { useState } from "react";
import Sidebar, { sidebarItems, SidebarItem } from "./components/Sidebar";
import CreateTaskContent from "./components/CreateTaskContent";
import ViewAllTasksContent from "./components/ViewAllTasksContent";
import MyTasksContent from "./components/MyTasksContent";
import LeaveApprovalContent from "./components/LeaveApprovalContent";
import SprintsContent from "../projects/sprints/page"; // You'll need to create this

type ActiveView = "CREATE_TASK" | "VIEW_ALL_TASKS" | "MY_TASKS" | "LEAVE_APPROVAL" | "SPRINTS";

const contentMap: Record<ActiveView, React.FC> = {
  CREATE_TASK: CreateTaskContent,
  VIEW_ALL_TASKS: ViewAllTasksContent,
  MY_TASKS: MyTasksContent,
  LEAVE_APPROVAL: LeaveApprovalContent,
  SPRINTS: SprintsContent,
};

const EmployeesPage: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>("CREATE_TASK");

  const ContentComponent = contentMap[activeView];

  const currentItem = sidebarItems.find(
    (item) => item.id === activeView
  ) as SidebarItem | undefined;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 p-10 overflow-y-auto">
        <ContentComponent />
      </main>
    </div>
  );
};

export default EmployeesPage;