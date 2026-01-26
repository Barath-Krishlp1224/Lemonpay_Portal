"use client";

import React, { useMemo, useState } from 'react';
import { Task } from './types';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from '@hello-pangea/dnd';
import { Clock, CheckCircle2, AlertCircle, MoreHorizontal, Target, User, Folder, Shield, ChevronDown, ChevronUp, Lock } from 'lucide-react';

interface TaskBoardViewProps {
    tasks: Task[];
    openTaskModal: (task: Task) => void;
    onTaskStatusChange: (taskId: string, newStatus: string) => void;
    currentUserRole?: string;
    currentUserName?: string;
    currentUserId?: string;
    containerHeight?: string;
    columnMaxHeight?: string;
    visibleRows?: number;
}

// Calculate task progress from subtasks
const calculateTaskProgressFromSubtasks = (subtasks: any[] | undefined | null): number => {
    if (!subtasks || subtasks.length === 0) return 0;
    
    const calculateSubtaskProgress = (subtask: any): number => {
        if (subtask.progress !== undefined) {
            return Number(subtask.progress) || 0;
        }
        
        switch (subtask.status?.toLowerCase()) {
            case "completed":
            case "done":
                return 100;
            case "in progress":
                return 50;
            case "paused":
                return 25;
            case "to do":
            case "todo":
            default:
                return 0;
        }
    };
    
    const flattenSubtasks = (subtasksList: any[]): any[] => {
        let flatList: any[] = [];
        subtasksList.forEach(sub => {
            flatList.push(sub);
            if (sub.subtasks && sub.subtasks.length > 0) {
                flatList = [...flatList, ...flattenSubtasks(sub.subtasks)];
            }
        });
        return flatList;
    };
    
    const allSubtasks = flattenSubtasks(subtasks);
    if (allSubtasks.length === 0) return 0;
    
    const totalProgress = allSubtasks.reduce((sum, sub) => {
        return sum + calculateSubtaskProgress(sub);
    }, 0);
    
    return Math.round(totalProgress / allSubtasks.length);
};

// Extended status columns with more workflow states
const statusColumns = [
    { title: "Icebox", status: "Icebox", color: "text-gray-400" },
    { title: "Backlog", status: "Backlog", color: "text-slate-400" },
    { title: "Prioritized", status: "Prioritized", color: "text-blue-400" },
    { title: "To Do", status: "To Do", color: "text-blue-500" },
    { title: "Ready for Dev", status: "Ready for Dev", color: "text-cyan-500" },
    { title: "In Progress", status: "In Progress", color: "text-amber-500" },
    { title: "Dev Review", status: "Dev Review", color: "text-purple-500" },
    { title: "Code Review", status: "Code Review", color: "text-violet-500" },
    { title: "QA Ready", status: "QA Ready", color: "text-fuchsia-500" },
    { title: "QA In Progress", status: "QA In Progress", color: "text-pink-500" },
    { title: "QA Review", status: "QA Review", color: "text-rose-500" },
    { title: "UAT", status: "UAT", color: "text-indigo-500" },
    { title: "Client Review", status: "Client Review", color: "text-indigo-600" },
    { title: "Ready for Release", status: "Ready for Release", color: "text-teal-500" },
    { title: "Staging", status: "Staging", color: "text-orange-500" },
    { title: "Production", status: "Production", color: "text-green-500" },
    { title: "Live", status: "Live", color: "text-emerald-500" },
    { title: "Done", status: "Done", color: "text-emerald-600" },
    { title: "Closed", status: "Closed", color: "text-gray-500" },
    { title: "Blocked", status: "Blocked", color: "text-red-500" },
    { title: "On Hold", status: "On Hold", color: "text-yellow-600" },
    { title: "Rejected", status: "Rejected", color: "text-red-600" },
];

const getProgressGradient = (completion: number) => {
    if (completion === 100) return 'bg-emerald-500';
    if (completion >= 70) return 'bg-blue-600';
    if (completion >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
};

// Check if user can edit task based on progress
const canEditTaskBasedOnProgress = (taskProgress: number, currentUserRole: string): boolean => {
    if (currentUserRole === "Admin" || currentUserRole === "Manager") return true;
    
    if (currentUserRole === "Employee") {
        return taskProgress < 100;
    }
    
    return false;
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
    // Calculate task progress from subtasks
    const calculatedProgress = useMemo(() => {
        return calculateTaskProgressFromSubtasks(task.subtasks);
    }, [task.subtasks]);
    
    const taskDisplayName = task.displayName || 
                           task.summary || 
                           task.title || 
                           task.name || 
                           `Task ${task.taskId || task._id?.substring(0, 8)}`;
    
    const projectName = task.projectName || task.project || (task.taskId ? task.taskId.split('-')[0] : 'Project');
    
    const displayAssignee = task.assigneeNames && task.assigneeNames.length > 0 
        ? task.assigneeNames[0] 
        : 'Unassigned';
    
    const isAssignedToCurrentUser = currentUserRole === "Employee" ? 
        task.assigneeNames?.some(name => name.toLowerCase() === currentUserName.toLowerCase()) ||
        task.assigneeIds?.some(id => id === currentUserId)
        : true;
    
    // Check if task can be edited based on progress
    const canEditTask = canEditTaskBasedOnProgress(calculatedProgress, currentUserRole);
    
    // Check if task is 100% complete
    const isTaskCompleted = calculatedProgress >= 100;

    return (
        <Draggable 
            draggableId={task._id} 
            index={index}
            isDragDisabled={(!isAssignedToCurrentUser && currentUserRole === "Employee") || isTaskCompleted}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`group bg-white p-6 rounded-[2rem] border border-slate-100 cursor-pointer transition-all duration-300 mb-4
                        ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-blue-500/20' : 'hover:shadow-xl hover:-translate-y-1'}
                        ${(!isAssignedToCurrentUser && currentUserRole === "Employee") ? 'opacity-60 cursor-not-allowed' : ''}
                        ${isTaskCompleted ? 'border-emerald-100 bg-emerald-50/30' : ''}`}
                    onClick={() => {
                        if ((isAssignedToCurrentUser || currentUserRole !== "Employee") && canEditTask) {
                            openTaskModal(task);
                        } else if (isTaskCompleted) {
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
                                {isTaskCompleted && (
                                    <span className="text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 size={8} />
                                        Complete
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
                            {isTaskCompleted && !canEditTask && currentUserRole === "Employee" && (
                                <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-full mr-1">
                                    <Lock size={10} className="text-emerald-500" />
                                    <span className="text-[8px] font-bold text-emerald-700">Read Only</span>
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
                            {isTaskCompleted && (
                                <span className="ml-2 text-emerald-600">
                                    ✓
                                </span>
                            )}
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
                            <div className="flex items-center gap-1">
                                <span className={`${getProgressGradient(calculatedProgress).replace('bg', 'text')} font-bold`}>
                                    {calculatedProgress}%
                                </span>
                                {calculatedProgress >= 100 && (
                                    <span className="text-emerald-500 text-[8px]">
                                        ✓
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-50 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${getProgressGradient(calculatedProgress)}`}
                                style={{ width: `${calculatedProgress}%` }}
                            />
                        </div>
                        {task.subtasks && task.subtasks.length > 0 && (
                            <div className="text-[9px] text-slate-400 font-medium mt-1">
                                Calculated from {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {/* Subtask count and Issue Type */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            {task.subtasks && task.subtasks.length > 0 ? (
                                <div className="flex items-center gap-1 text-[10px] font-bold">
                                    <CheckCircle2 size={10} className={isTaskCompleted ? "text-emerald-500" : "text-slate-500"} />
                                    <span className={isTaskCompleted ? "text-emerald-600" : "text-slate-600"}>
                                        {task.subtasks.filter(st => st.status === 'Completed' || st.status === 'Done').length}/{task.subtasks.length} subtasks
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
    containerHeight = "75vh",
    columnMaxHeight = "65vh",
    visibleRows = 2
}) => {
    const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

    const tasksByStatus = useMemo(() => {
        return tasks.reduce((acc, task) => {
            let status = task.status || 'Backlog';
            
            const statusMap: Record<string, string> = {
                'Icebox': 'Icebox',
                'Backlog': 'Backlog',
                'Prioritized': 'Prioritized',
                'Todo': 'To Do',
                'To Do': 'To Do',
                'Ready for Dev': 'Ready for Dev',
                'Ready': 'Ready for Dev',
                'In Progress': 'In Progress',
                'InDevelopment': 'In Progress',
                'Development': 'In Progress',
                'Dev Review': 'Dev Review',
                'Code Review': 'Code Review',
                'QA Ready': 'QA Ready',
                'QA In Progress': 'QA In Progress',
                'QA / Testing': 'QA In Progress',
                'Testing': 'QA In Progress',
                'Test In Progress': 'QA In Progress',
                'QA Review': 'QA Review',
                'UAT': 'UAT',
                'User Acceptance': 'UAT',
                'Client Review': 'Client Review',
                'Ready for Release': 'Ready for Release',
                'Staging': 'Staging',
                'Production': 'Production',
                'Live': 'Live',
                'Completed': 'Done',
                'Done': 'Done',
                'Closed': 'Closed',
                'Blocked': 'Blocked',
                'On Hold': 'On Hold',
                'Rejected': 'Rejected',
                'Deployment Stage': 'Staging',
                'Pilot Test': 'UAT',
                'Deployed in QA': 'QA In Progress',
                'QA Sign Off': 'QA Review'
            };
            
            const mappedStatus = statusMap[status] || status;
            
            if (statusColumns.find(col => col.status === mappedStatus)) {
                if (!acc[mappedStatus]) acc[mappedStatus] = [];
                acc[mappedStatus].push(task);
            }
            return acc;
        }, {} as { [key: string]: Task[] });
    }, [tasks]);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        
        const draggedTask = tasks.find(t => t._id === draggableId);
        
        if (!draggedTask) return;
        
        // Calculate progress for the dragged task
        const taskProgress = calculateTaskProgressFromSubtasks(draggedTask.subtasks);
        
        // Check if task is 100% complete
        if (taskProgress >= 100) {
            alert("Cannot move task: Task is 100% complete and locked");
            return;
        }
        
        // Check permission for employees
        if (currentUserRole === "Employee") {
            const isAssigned = draggedTask.assigneeNames?.some(
                name => name.toLowerCase() === currentUserName.toLowerCase()
            ) || draggedTask.assigneeIds?.some(id => id === currentUserId);
            
            if (!isAssigned) {
                alert("You are not authorized to move this task");
                return;
            }
        }
        
        onTaskStatusChange(draggableId, destination.droppableId);
    };

    const toggleColumnExpansion = (status: string) => {
        setExpandedColumns(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

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
            className="w-full overflow-x-auto custom-scrollbar"
            style={{ height: containerHeight }}
        >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-8 pb-10 px-6 custom-scrollbar min-w-max h-full">
                    {statusColumns.map((column) => {
                        const columnTasks = tasksByStatus[column.status] || [];
                        const visibleTasks = getVisibleTasks(column.status);
                        const isExpanded = expandedColumns[column.status];
                        const hasMoreTasks = columnTasks.length > visibleRows;
                        
                        // Count completed tasks in this column
                        const completedTasksCount = columnTasks.filter(task => {
                            const progress = calculateTaskProgressFromSubtasks(task.subtasks);
                            return progress >= 100;
                        }).length;
                        
                        return (
                            <div key={column.status} className="flex-shrink-0 w-[340px] flex flex-col h-full">
                                
                                {/* Column Header */}
                                <div className="flex items-center justify-between px-6 py-4 mb-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10 rounded-[2rem] shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${column.color.replace('text', 'bg')} shadow-sm ring-2 ring-white`} />
                                        <div>
                                            <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-slate-800">
                                                {column.title}
                                            </h3>
                                            {columnTasks.length > 0 && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[9px] text-slate-400 font-bold">
                                                        {columnTasks.length} task{columnTasks.length !== 1 ? 's' : ''}
                                                    </p>
                                                    {completedTasksCount > 0 && (
                                                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                                            {completedTasksCount} ✓
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasMoreTasks && (
                                            <button 
                                                onClick={() => toggleColumnExpansion(column.status)}
                                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-full hover:bg-slate-100"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp size={14} />
                                                        <span className="text-[10px] font-medium">Less</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown size={14} />
                                                        <span className="text-[10px] font-medium">+{columnTasks.length - visibleRows}</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <span className="bg-white border border-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 shadow-sm min-w-[2rem] text-center">
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
                                                overflow-y-auto custom-scrollbar-thin border border-slate-100/50`}
                                            style={{ maxHeight: columnMaxHeight }}
                                        >
                                            {visibleTasks.map((task, index) => {
                                                const taskProgress = calculateTaskProgressFromSubtasks(task.subtasks);
                                                const isTaskCompleted = taskProgress >= 100;
                                                
                                                return (
                                                    <div key={task._id} className={isTaskCompleted ? 'relative' : ''}>
                                                        {isTaskCompleted && (
                                                            <div className="absolute top-2 right-2 z-10">
                                                                <div className="bg-emerald-500 text-white p-1 rounded-full">
                                                                    <CheckCircle2 size={12} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <TaskCard 
                                                            task={task} 
                                                            index={index} 
                                                            openTaskModal={openTaskModal}
                                                            currentUserRole={currentUserRole}
                                                            currentUserName={currentUserName}
                                                            currentUserId={currentUserId}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            {provided.placeholder}

                                            {columnTasks.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] opacity-40 hover:opacity-60 transition-opacity bg-white/50">
                                                    <AlertCircle size={24} className="text-slate-300 mb-2" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tasks</p>
                                                    <p className="text-[9px] text-slate-400 mt-1">Drop tasks here</p>
                                                </div>
                                            )}

                                            {/* Show More indicator */}
                                            {!isExpanded && hasMoreTasks && (
                                                <div className="pt-4 border-t border-slate-200/50">
                                                    <div className="flex items-center justify-center text-slate-400 text-xs font-medium py-2">
                                                        <ChevronDown size={16} className="mr-1" />
                                                        <span className="text-[10px]">
                                                            {columnTasks.length - visibleRows} more task{columnTasks.length - visibleRows !== 1 ? 's' : ''}
                                                        </span>
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
            
            {/* Add CSS for custom scrollbar */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .custom-scrollbar-thin::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default TaskBoardView;