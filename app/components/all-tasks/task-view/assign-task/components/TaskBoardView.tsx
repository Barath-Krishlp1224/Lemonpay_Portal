"use client";

import React, { useMemo } from 'react';
import { Task } from './types'; 
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from '@hello-pangea/dnd';
import { MoreHorizontal, AlertCircle } from 'lucide-react';

interface TaskBoardViewProps {
    tasks: Task[];
    openTaskModal: (task: Task) => void;
    onTaskStatusChange: (taskId: string, newStatus: string) => void;
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

const TaskCard: React.FC<{ task: Task, index: number, openTaskModal: (task: Task) => void }> = ({ task, index, openTaskModal }) => {
    const displayAssignee = task.assigneeNames && task.assigneeNames.length > 0 
        ? task.assigneeNames[0] 
        : 'Unassigned';
    
    return (
        <Draggable draggableId={task._id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`group bg-white p-6 rounded-[2rem] border border-slate-100 cursor-pointer transition-all duration-300
                        ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl z-50 ring-2 ring-blue-500/20' : 'hover:shadow-xl hover:-translate-y-1'}`}
                    onClick={() => openTaskModal(task)}
                >
                    <div className="flex items-start justify-between mb-4">
                        <span className="text-[9px] font-black bg-slate-50 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest">
                            {task.projectId || 'TASK'}
                        </span>
                        <button className="text-slate-300 group-hover:text-slate-600 transition-colors">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    {/* Use .project instead of .title */}
                    <h4 className="text-sm font-black text-slate-800 leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                        {task.project}
                    </h4>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100">
                            {displayAssignee.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 truncate">{displayAssignee}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-slate-400">Completion</span>
                            <span className="text-slate-800">{task.completion}%</span>
                        </div>
                        <div className="bg-slate-50 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${getProgressGradient(task.completion)}`}
                                style={{ width: `${task.completion}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const TaskBoardView: React.FC<TaskBoardViewProps> = ({ tasks, openTaskModal, onTaskStatusChange }) => {

    const tasksByStatus = useMemo(() => {
        return tasks.reduce((acc, task) => {
            const status = task.status || 'Backlog';
            if (!acc[status]) acc[status] = [];
            acc[status].push(task);
            return acc;
        }, {} as { [key: string]: Task[] });
    }, [tasks]);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        
        onTaskStatusChange(draggableId, destination.droppableId);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-8 overflow-x-auto pb-10 px-4 custom-board-scrollbar">
                {statusColumns.map((column) => (
                    <div key={column.status} className="flex-shrink-0 w-[340px] flex flex-col">
                        
                        <div className="flex items-center justify-between px-6 py-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${column.color.replace('text', 'bg')}`} />
                                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-800">
                                    {column.title}
                                </h3>
                            </div>
                            <span className="bg-white border border-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 shadow-sm">
                                {tasksByStatus[column.status]?.length || 0}
                            </span>
                        </div>

                        <Droppable droppableId={column.status}>
                            {(provided, snapshot) => (
                                <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 space-y-5 p-3 rounded-[3rem] transition-all duration-300 min-h-[600px]
                                        ${snapshot.isDraggingOver ? 'bg-blue-50/50 ring-2 ring-blue-500/10 ring-inset' : 'bg-transparent'}`}
                                >
                                    {(tasksByStatus[column.status] || []).map((task, index) => (
                                        <TaskCard 
                                            key={task._id} 
                                            task={task} 
                                            index={index} 
                                            openTaskModal={openTaskModal} 
                                        />
                                    ))}

                                    {provided.placeholder}

                                    {(!tasksByStatus[column.status] || tasksByStatus[column.status].length === 0) && (
                                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] opacity-40">
                                            <AlertCircle size={24} className="text-slate-300 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empty Stack</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                .custom-board-scrollbar::-webkit-scrollbar { height: 8px; }
                .custom-board-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-board-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
            `}</style>
        </DragDropContext>
    );
};

export default TaskBoardView;