import React from "react";
import {
  SquarePen,
  ListChecks,
  UserCheck,
  ClipboardCheck,
  CalendarDays, // Added for Sprints
  LucideIcon
} from "lucide-react";

// Update ActiveView type to include SPRINTS
export type ActiveView = "CREATE_TASK" | "SPRINTS" | "VIEW_ALL_TASKS" | "MY_TASKS" | "LEAVE_APPROVAL";

export interface SidebarItem {
  id: ActiveView;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

// Add SPRINTS as the second item in the array
export const sidebarItems: SidebarItem[] = [
  {
    id: "CREATE_TASK",
    icon: SquarePen,
    label: "Create Task",
  },
  {
    id: "SPRINTS",
    icon: CalendarDays, // Using CalendarDays icon for sprints
    label: "Sprints",
  },
  {
    id: "VIEW_ALL_TASKS",
    icon: ListChecks,
    label: "View All Tasks",
  },
  {
    id: "MY_TASKS",
    icon: UserCheck,
    label: "My Tasks",
  },
  {
    id: "LEAVE_APPROVAL",
    icon: ClipboardCheck,
    label: "Leave Approvals",
  },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full py-4 px-3 border border-gray-200 z-20">
      <div className="flex flex-col items-center space-y-4">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
              activeView === item.id
                ? "bg-green-600 text-white shadow-lg"
                : "text-gray-500 hover:bg-gray-100 hover:text-green-600"
            }`}
            title={item.label}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;