import { Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import { format } from 'date-fns';
import { Edit2, AlertCircle } from 'lucide-react';

interface TaskOverviewTableProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
}

export default function TaskOverviewTable({ tasks, onEdit }: TaskOverviewTableProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-5 py-4 font-semibold text-slate-600 text-left border-r border-slate-100 min-w-[150px]">Project</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100 min-w-[100px]">Type</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Priority</th>
                            <th className="px-5 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Phase</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">PC</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100 min-w-[120px]">Assignees</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Status</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Start</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">End</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Actual End</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Time Taken</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Activity %</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-center border-r border-slate-100">Bugs (T/H/F)</th>
                            <th className="px-5 py-4 font-semibold text-slate-600 text-left border-r border-slate-100 max-w-[200px]">Comments</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border-r border-slate-100">Deviation</th>
                            <th className="px-4 py-4 font-semibold text-slate-600 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.map((task, index) => (
                            <tr key={task.id} className={`hover:bg-slate-50/50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                <td className="px-5 py-4 font-semibold text-slate-800 border-r border-slate-50">
                                    <div className="truncate max-w-[200px]" title={task.projectName}>{task.projectName}</div>
                                </td>
                                <td className="px-4 py-4 text-slate-600 border-r border-slate-50">{task.projectType || '-'}</td>
                                <td className="px-4 py-4 text-slate-600 border-r border-slate-50">
                                    {task.priority && (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${task.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                                task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600 border-r border-slate-50">{task.subPhase || '-'}</td>
                                <td className="px-4 py-4 border-r border-slate-50">{task.pc || '-'}</td>
                                <td className="px-4 py-4 border-r border-slate-50">
                                    <div className="flex -space-x-2 overflow-hidden hover:space-x-1 transition-all">
                                        {task.assignedTo && (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0" title={`Primary: ${task.assignedTo}`}>
                                                {task.assignedTo.charAt(0)}
                                            </div>
                                        )}
                                        {task.assignedTo2 && (
                                            <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0" title={`Secondary: ${task.assignedTo2}`}>
                                                {task.assignedTo2.charAt(0)}
                                            </div>
                                        )}
                                        {task.additionalAssignees?.map((assignee, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-600 flex-shrink-0" title={`Additional: ${assignee}`}>
                                                {assignee.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-4 border-r border-slate-50">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold w-fit border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    task.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {task.status}
                                        </span>
                                        {isTaskOverdue(task) && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 w-fit">
                                                <AlertCircle size={10} />
                                                {getOverdueDays(task)}d late
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-50 text-xs whitespace-nowrap">
                                    {task.startDate ? format(new Date(task.startDate), 'MMM d') : '-'}
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-50 text-xs whitespace-nowrap">
                                    {task.endDate ? format(new Date(task.endDate), 'MMM d') : '-'}
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-50 text-xs whitespace-nowrap">
                                    {task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}
                                </td>
                                <td className="px-4 py-4 text-slate-600 font-mono text-xs border-r border-slate-50">
                                    {task.timeTaken || '00:00:00'}
                                </td>
                                <td className="px-4 py-4 text-center border-r border-slate-50">
                                    <span className="font-bold text-slate-700">{task.activityPercentage || 0}%</span>
                                </td>
                                <td className="px-4 py-4 text-center border-r border-slate-50">
                                    <div className="text-xs font-mono">
                                        <span className="text-slate-900 font-bold" title="Total">{task.bugCount}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span className="text-orange-600" title="HTML">{task.htmlBugs}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span className="text-red-600" title="Functional">{task.functionalBugs}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-500 max-w-[200px] truncate border-r border-slate-50" title={task.comments || ''}>
                                    {task.comments || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate border-r border-slate-50" title={task.deviationReason || ''}>
                                    {task.deviationReason || '-'}
                                </td>
                                <td className="px-4 py-4 border-r border-slate-50">
                                    <button
                                        onClick={() => onEdit(task)}
                                        className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition-all"
                                        title="Edit Task"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
