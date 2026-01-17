"use client";

import React, { useMemo, useState } from 'react';
import { Task } from './types';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from '@hello-pangea/dnd';
import { Clock, CheckCircle2, AlertCircle, MoreHorizontal, Target, User, Folder, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskBoardViewProps {
    tasks: Task[];
    openTaskModal: (task: Task) => void;
    onTaskStatusChange: (taskId: string, newStatus: string) => void;
    currentUserRole?: string;
    currentUserName?: string;
    currentUserId?: string;
    containerHeight?: string;     // New: Container height
    columnMaxHeight?: string;     // New: Column max height
    visibleRows?: number;         // New: Visible rows per column
}

const statusColumns = [
    { title: "Backlog", status: "Backlog", color: "text-slate-400" },
    { title: "To Do", status: "To Do", color: "text-blue-500" },
    { title: "In Progress", status: "In Progress", color: "text-amber-500" },
    { title: "Dev Review", status: "Dev Review", color: "text-purple-500" },
    { title: "QA / Testing", status: "Deployed in QA", color: "text-pink-500" },
    { title: "Sign Off", status: "QA Sign Off", color: "text-indigo-500" },
    { title: "Done", status: "Completed", color: "text-emerald-500" },
];

const getProgressGradient = (completion: number) => {
    if (completion === 100) return 'bg-emerald-500';
    if (completion >= 70) return 'bg-blue-600';
    if (completion >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
};

interface TaskCardProps {
    task: Task; 
    index: number; 
    openTaskModal: (task: Task) => void;
    currentUserRole?: string;
    currentUserName?: string;
    currentUserId?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
    task, 
    index, 
    openTaskModal,
    currentUserRole = "Employee",
    currentUserName = "",
    currentUserId = ""
}) => {
    // Get task display name - using summary, title, name, or fallback to taskId
    const taskDisplayName = task.displayName || 
                           task.summary || 
                           task.title || 
                           task.name || 
                           `Task ${task.taskId || task._id?.substring(0, 8)}`;
    
    // Get project name - prefer projectName, then project, then extract from taskId
    const projectName = task.projectName || task.project || (task.taskId ? task.taskId.split('-')[0] : 'Project');
    
    // Get assignee display - first assignee or fallback
    const displayAssignee = task.assigneeNames && task.assigneeNames.length > 0 
        ? task.assigneeNames[0] 
        : 'Unassigned';
    
    // Check if current user is assigned to this task
    const isAssignedToCurrentUser = currentUserRole === "Employee" ? 
        task.assigneeNames?.some(name => name.toLowerCase() === currentUserName.toLowerCase()) ||
        task.assigneeIds?.some(id => id === currentUserId)
        : true;

    return (
        <Draggable 
            draggableId={task._id} 
            index={index}
            isDragDisabled={!isAssignedToCurrentUser && currentUserRole === "Employee"}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`group bg-white p-6 rounded-[2rem] border border-slate-100 cursor-pointer transition-all duration-300 mb-4
                        ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-blue-500/20' : 'hover:shadow-xl hover:-translate-y-1'}
                        ${!isAssignedToCurrentUser && currentUserRole === "Employee" ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                        if (isAssignedToCurrentUser || currentUserRole !== "Employee") {
                            openTaskModal(task);
                        }
                    }}
                >
                    {/* Header with Task ID, Priority, and Project */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                            {/* Project Badge */}
                            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full w-fit">
                                <Folder size={10} className="text-slate-400" />
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
                                    {projectName}
                                </span>
                            </div>
                            
                            {/* Task ID and Priority */}
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black bg-slate-50 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {task.taskId || `TASK-${task._id?.substring(0, 4)}`}
                                </span>
                                {task.priority && (
                                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                                        task.priority === 'Critical' 
                                            ? 'bg-red-100 text-red-700 border border-red-200' 
                                            : task.priority === 'High'
                                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                            : task.priority === 'Medium'
                                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                            : 'bg-green-100 text-green-700 border border-green-200'
                                    }`}>
                                        {task.priority}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {!isAssignedToCurrentUser && currentUserRole === "Employee" && (
                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full mr-1">
                                    <Shield size={10} className="text-slate-400" />
                                    <span className="text-[8px] font-bold text-slate-500">Not Assigned</span>
                                </div>
                            )}
                            <button className="text-slate-300 group-hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Task Name/Title - Main content */}
                    <div className="mb-4">
                        <h4 className="text-sm font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-3 min-h-[3rem]">
                            {taskDisplayName}
                        </h4>
                        {task.remarks && (
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-2">
                                {task.remarks}
                            </p>
                        )}
                    </div>

                    {/* Assignee and Additional Info */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center border border-blue-200">
                                <User size={12} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">{displayAssignee}</p>
                                <p className="text-[9px] text-slate-400 font-medium">Assignee</p>
                            </div>
                        </div>
                        
                        {/* Story Points (if available) */}
                        {(task.taskStoryPoints || task.taskStoryPoints) && (
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                    <Target size={12} className="text-slate-400" />
                                    <span className="text-[11px] font-bold text-slate-700">
                                        {task.taskStoryPoints || task.taskStoryPoints} pts
                                    </span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Story Points</p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-slate-400">Progress</span>
                            <span className={`${getProgressGradient(task.completion).replace('bg', 'text')} font-bold`}>
                                {task.completion}%
                            </span>
                        </div>
                        <div className="bg-slate-50 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${getProgressGradient(task.completion)}`}
                                style={{ width: `${task.completion}%` }}
                            />
                        </div>
                    </div>

                    {/* Subtask count and Issue Type */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            {task.subtasks && task.subtasks.length > 0 ? (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                                    <CheckCircle2 size={10} />
                                    <span>
                                        {task.subtasks.filter(st => st.status === 'Completed').length}/{task.subtasks.length} subtasks
                                    </span>
                                </div>
                            ) : (
                                <div className="text-[10px] text-slate-400 font-medium">
                                    No subtasks
                                </div>
                            )}
                            
                            {task.issueType && (
                                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                                    task.issueType === 'Epic' 
                                        ? 'bg-purple-100 text-purple-700' 
                                        : task.issueType === 'Story'
                                        ? 'bg-blue-100 text-blue-700'
                                        : task.issueType === 'Bug'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {task.issueType}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const TaskBoardView: React.FC<TaskBoardViewProps> = ({ 
    tasks, 
    openTaskModal, 
    onTaskStatusChange,
    currentUserRole = "Employee",
    currentUserName = "",
    currentUserId = "",
    containerHeight = "70vh",      // Default container height
    columnMaxHeight = "60vh",      // Default column max height
    visibleRows = 2                // Default visible rows
}) => {
    // State to track which columns are expanded
    const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

    const tasksByStatus = useMemo(() => {
        return tasks.reduce((acc, task) => {
            // Normalize status names for consistency
            let status = task.status || 'Backlog';
            
            // Map similar statuses to standard columns
            if (status === 'Test In Progress' || status === 'Deployed in QA') {
                status = 'Deployed in QA';
            }
            if (status === 'QA Sign Off' || status === 'Deployment Stage' || status === 'Pilot Test') {
                status = 'QA Sign Off';
            }
            if (status === 'Completed' || status === 'Done') {
                status = 'Completed';
            }
            if (status === 'To Do' || status === 'Todo') {
                status = 'To Do';
            }
            
            if (!acc[status]) acc[status] = [];
            acc[status].push(task);
            return acc;
        }, {} as { [key: string]: Task[] });
    }, [tasks]);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        
        // Find the task being dragged
        const draggedTask = tasks.find(t => t._id === draggableId);
        
        // Check permission for employees
        if (currentUserRole === "Employee" && draggedTask) {
            const isAssigned = draggedTask.assigneeNames?.some(
                name => name.toLowerCase() === currentUserName.toLowerCase()
            ) || draggedTask.assigneeIds?.some(id => id === currentUserId);
            
            if (!isAssigned) {
                // Don't allow drag if employee is not assigned to this task
                return;
            }
        }
        
        onTaskStatusChange(draggableId, destination.droppableId);
    };

    // Toggle column expansion
    const toggleColumnExpansion = (status: string) => {
        setExpandedColumns(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

    // Get visible tasks for a column based on expansion state
    const getVisibleTasks = (status: string) => {
        const allTasks = tasksByStatus[status] || [];
        const isExpanded = expandedColumns[status];
        
        if (isExpanded) {
            return allTasks;
        }
        
        return allTasks.slice(0, visibleRows);
    };

    return (
        <div 
            className="w-full overflow-x-auto"
            style={{ height: containerHeight }}
        >
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-8 pb-10 px-4 custom-scrollbar min-w-max h-full">
                    {statusColumns.map((column) => {
                        const columnTasks = tasksByStatus[column.status] || [];
                        const visibleTasks = getVisibleTasks(column.status);
                        const isExpanded = expandedColumns[column.status];
                        const hasMoreTasks = columnTasks.length > visibleRows;
                        
                        return (
                            <div key={column.status} className="flex-shrink-0 w-[340px] flex flex-col h-full">
                                
                                {/* Column Header */}
                                <div className="flex items-center justify-between px-6 py-4 mb-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10 rounded-[2rem] shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${column.color.replace('text', 'bg')} shadow-sm`} />
                                        <div>
                                            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-800">
                                                {column.title}
                                            </h3>
                                            {columnTasks.length > 0 && (
                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                    {columnTasks.length} task{columnTasks.length !== 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasMoreTasks && (
                                            <button 
                                                onClick={() => toggleColumnExpansion(column.status)}
                                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp size={14} />
                                                        Show Less
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown size={14} />
                                                        Show More ({columnTasks.length - visibleRows})
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <span className="bg-white border border-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 shadow-sm">
                                            {columnTasks.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Drop Area - Fixed height with scroll */}
                                <Droppable droppableId={column.status}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 space-y-3 p-3 rounded-[3rem] transition-all duration-300 
                                                ${snapshot.isDraggingOver ? 'bg-blue-50/50 ring-2 ring-blue-500/10 ring-inset' : 'bg-slate-50/30'}
                                                overflow-y-auto`}
                                            style={{ maxHeight: columnMaxHeight }}
                                        >
                                            {visibleTasks.map((task, index) => (
                                                <TaskCard 
                                                    key={task._id} 
                                                    task={task} 
                                                    index={index} 
                                                    openTaskModal={openTaskModal}
                                                    currentUserRole={currentUserRole}
                                                    currentUserName={currentUserName}
                                                    currentUserId={currentUserId}
                                                />
                                            ))}

                                            {provided.placeholder}

                                            {columnTasks.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] opacity-40 hover:opacity-60 transition-opacity">
                                                    <AlertCircle size={24} className="text-slate-300 mb-2" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tasks</p>
                                                    <p className="text-[9px] text-slate-400 mt-1">Drop tasks here</p>
                                                </div>
                                            )}

                                            {/* Show More indicator */}
                                            {!isExpanded && hasMoreTasks && (
                                                <div className="pt-4 border-t border-slate-200">
                                                    <div className="flex items-center justify-center text-slate-400 text-xs font-medium">
                                                        <ChevronDown size={16} className="mr-1" />
                                                        {columnTasks.length - visibleRows} more tasks
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
};

export default TaskBoardView;