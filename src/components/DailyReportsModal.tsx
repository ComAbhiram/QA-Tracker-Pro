/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { X, Camera, FileText, Calendar, ClipboardList, ChevronRight, Download, Eye, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';
import Combobox from '@/components/ui/Combobox';
import CloseButton from '@/components/ui/CloseButton';
import ReportActions from '@/components/ui/ReportActions';

interface DailyReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DailyReportsModal({ isOpen, onClose }: DailyReportsModalProps) {
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([]);
    const [selectedQA, setSelectedQA] = useState<string>('');
    const [selectedQADate, setSelectedQADate] = useState(new Date().toISOString().split('T')[0]);
    const [teamName, setTeamName] = useState<string>('Team');
    const [showHubstaffConfirm, setShowHubstaffConfirm] = useState(false);
    const [hubstaffLoadingState, setHubstaffLoadingState] = useState<'show' | 'hide' | null>(null);
    const [pendingImageAction, setPendingImageAction] = useState<'download' | 'copy'>('download');
    const [scheduleDate, setScheduleDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            fetchTasks();
            fetchTeamMembers();
            fetchTeamInfo();
        }
    }, [isOpen]);

    const fetchTeamInfo = async () => {
        try {
            const { getCurrentUserTeam } = await import('@/utils/userUtils');
            const team = await getCurrentUserTeam();
            if (team && team.team_name) {
                setTeamName(team.team_name);
            }
        } catch (error) {
            console.error('Error fetching team info:', error);
        }
    };

    const fetchTasks = async () => {
        const { getCurrentUserTeam } = await import('@/utils/userUtils');
        const currentUser = await getCurrentUserTeam();

        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (currentUser && currentUser.team_id) {
            query = query.eq('team_id', currentUser.team_id);
        }

        const { data, error } = await query;

        if (!error && data) {
            setTasks(data.map(mapTaskFromDB));
        }
    };

    const fetchTeamMembers = async () => {
        try {
            // Fetch from our new members API which returns ALL Hubstaff members
            const response = await fetch('/api/hubstaff/members');
            if (response.ok) {
                const data = await response.json();
                setTeamMembers(data.members || []);
            }
        } catch (err) {
            console.error('Error fetching team members:', err);
        }
    };

    const generateQAWorkStatusText = async () => {
        if (!selectedQA) {
            alert('Please select a QA member');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/hubstaff/qa-status?date=${selectedQADate}&qaName=${encodeURIComponent(selectedQA)}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || 'Failed to generate QA work status');
            }

            const data = await response.json();
            console.log('[Frontend] QA Status Data:', data);

            if (typeof data.formattedText !== 'string' || data.formattedText.length === 0) {
                console.error('Invalid formattedText:', data.formattedText);
                alert('Received invalid report text from server');
                return;
            }

            // Copy to clipboard with proper error handling
            try {
                await navigator.clipboard.writeText(data.formattedText);
                console.log('[Frontend] Copied to clipboard:', data.formattedText.substring(0, 100));
                alert(`Work Status for ${selectedQA} copied to clipboard!`);
            } catch (clipboardError) {
                console.error('Clipboard write failed:', clipboardError);
                // Fallback: Show modal with copyable text (better for mobile)
                const modal = document.createElement('div');
                modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';

                const content = document.createElement('div');
                content.style.cssText = 'background:white;border-radius:12px;padding:24px;max-width:600px;width:100%;max-height:80vh;display:flex;flex-direction:column;';

                const title = document.createElement('h3');
                title.textContent = 'Work Status Report';
                title.style.cssText = 'margin:0 0 16px 0;font-size:18px;font-weight:600;color:#1e293b;';

                const textarea = document.createElement('textarea');
                textarea.value = data.formattedText;
                textarea.style.cssText = 'width:100%;min-height:300px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:13px;resize:vertical;margin-bottom:16px;';
                textarea.readOnly = true;

                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'display:flex;gap:12px;justify-content:flex-end;';

                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copy Text';
                copyBtn.style.cssText = 'padding:10px 20px;background:#0ea5e9;color:white;border:none;border-radius:8px;font-weight:500;cursor:pointer;';
                copyBtn.onclick = () => {
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        copyBtn.textContent = '✓ Copied!';
                        setTimeout(() => copyBtn.textContent = 'Copy Text', 2000);
                    } catch (e) {
                        alert('Please select the text and press Ctrl+C (or Cmd+C) to copy');
                    }
                };

                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Close';
                closeBtn.style.cssText = 'padding:10px 20px;background:#64748b;color:white;border:none;border-radius:8px;font-weight:500;cursor:pointer;';
                closeBtn.onclick = () => document.body.removeChild(modal);

                buttonContainer.appendChild(copyBtn);
                buttonContainer.appendChild(closeBtn);
                content.appendChild(title);
                content.appendChild(textarea);
                content.appendChild(buttonContainer);
                modal.appendChild(content);
                document.body.appendChild(modal);

                // Auto-select text for easy copying
                textarea.select();
            }
        } catch (error) {
            console.error('Error generating QA work status:', error);
            alert('Failed to generate QA work status: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    const copyImageFromCanvas = async (canvas: HTMLCanvasElement, successMessage: string) => {
        try {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) { alert('Failed to generate image blob'); return; }
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert(successMessage);
        } catch (err) {
            console.error('Copy image failed:', err);
            alert('Copy image is not supported in this browser. Please use the Download button instead.');
        }
    };

    const generateQAWorkStatusImage = async (action: 'download' | 'copy' = 'download') => {
        if (!selectedQA) {
            alert('Please select a QA member');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/hubstaff/qa-status?date=${selectedQADate}&qaName=${encodeURIComponent(selectedQA)}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || 'Failed to fetch QA work status');
            }

            const qaData = await response.json();

            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.toLocaleString('en-US', { month: 'short' });
                const year = d.getFullYear();
                return `<span>${day}</span><span style="margin: 0 4px;">${month}</span><span>${year}</span>`;
            };

            const formatTime = (seconds: number) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            };

            // Create a temporary container
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 40px; width: 1200px;';

            container.innerHTML = `
                <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: white;">
                    <div style="margin-bottom: 40px; border-bottom: 4px solid #f1f5f9; padding-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <h1 style="color: #0f172a; font-size: 42px; margin: 0 0 8px 0; font-weight: 900; letter-spacing: -1px;">
                                Work Status <span style="color: #64748b; font-weight: 400;">/</span> ${selectedQA}
                            </h1>
                            <p style="color: #64748b; font-size: 20px; margin: 0; font-weight: 500;">${new Date(selectedQADate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div style="text-align: right;">
                             <p style="color: #94a3b8; font-size: 14px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Productivity</p>
                             <p style="color: #0f172a; font-size: 32px; font-weight: 900; margin: 0;">${qaData.tasks.length} <span style="font-size: 16px; color: #64748b; font-weight: 600;">Tasks</span></p>
                        </div>
                    </div>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 30px; margin-bottom: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 50px; height: 50px; background: #0ea5e9; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px;">
                                ${selectedQA.charAt(0)}
                            </div>
                            <div>
                                <h3 style="color: #0f172a; font-size: 24px; margin: 0; font-weight: 800;">Hubstaff Activity</h3>
                                <p style="color: #64748b; font-size: 14px; margin: 0;">${qaData.hubstaffActivity.projects.join(' / ') || 'General Tasks'}</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 40px; text-align: right;">
                            <div>
                                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Time Worked</p>
                                <p style="color: #0ea5e9; font-size: 24px; font-weight: 900; margin: 0;">${formatTime(qaData.hubstaffActivity.timeWorked)}</p>
                            </div>
                            <div>
                                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Activity Level</p>
                                <p style="color: #10b981; font-size: 24px; font-weight: 900; margin: 0;">${qaData.hubstaffActivity.activityPercentage}%</p>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
                        ${qaData.tasks.length === 0 ? 
                            '<div style="grid-column: span 2; padding: 60px; text-align: center; color: #94a3b8; font-size: 18px; font-weight: 500; background: #f8fafc; border-radius: 20px;">No tasks scheduled for this date</div>' : 
                            qaData.tasks.map((task: any) => {
                                const effectiveStatus = getEffectiveStatus(task);
                                let displayStatus = effectiveStatus;
                                let statusColor = '#64748b';
                                let statusBg = '#f1f5f9';

                                if (effectiveStatus === 'Completed') { statusColor = '#059669'; statusBg = '#ecfdf5'; }
                                else if (effectiveStatus === 'In Progress') { statusColor = '#2563eb'; statusBg = '#eff6ff'; }
                                else if (effectiveStatus === 'Yet to Start') { statusColor = '#d97706'; statusBg = '#fffbeb'; }
                                else if (effectiveStatus === 'Overdue') { statusColor = '#dc2626'; statusBg = '#fef2f2'; }

                                if (effectiveStatus === 'Overdue' && task.endDate) {
                                    const end = new Date(task.endDate);
                                    const now = new Date();
                                    end.setHours(23, 59, 59, 999);
                                    now.setHours(0, 0, 0, 0);
                                    const diffDays = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays > 0) displayStatus = `Overdue (+${diffDays}d)`;
                                }

                                let pColor = '#94a3b8';
                                if (task.priority === 'High') pColor = '#ef4444';
                                else if (task.priority === 'Medium') pColor = '#f97316';
                                else if (task.priority === 'Low') pColor = '#22c55e';

                                return `
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <div style="color: #0f172a; font-weight: 800; font-size: 18px; flex: 1; line-height: 1.3;">${task.projectName}</div>
                                            <div style="background: ${statusBg}; color: ${statusColor}; padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; white-space: nowrap; margin-left: 15px;">${displayStatus}</div>
                                        </div>
                                        
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            <span style="font-size: 13px; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 8px; font-weight: 600;">${task.projectType || 'Project'}</span>
                                            <span style="font-size: 13px; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 8px; font-weight: 600;">${task.subPhase || 'N/A'}</span>
                                            ${task.pc ? `<span style="font-size: 13px; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 8px; font-weight: 600;">PC: ${task.pc}</span>` : ''}
                                        </div>

                                        <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                            <div style="font-size: 13px; color: #475569;">
                                                <span style="font-weight: 800; color: #0f172a;">Start:</span> ${task.startDate ? formatDate(task.startDate) : '-'}
                                                <span style="margin: 0 6px; color: #cbd5e1;">|</span>
                                                <span style="font-weight: 800; color: #0f172a;">End:</span> ${task.endDate ? formatDate(task.endDate) : '-'}
                                            </div>
                                            ${task.priority ? `<div style="font-size: 11px; font-weight: 900; color: ${pColor}; text-transform: uppercase; letter-spacing: 0.5px;">${task.priority}</div>` : ''}
                                        </div>
                                        
                                        ${task.comments ? `<div style="font-size: 13px; color: #64748b; line-height: 1.5; background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 4px solid #cbd5e1; font-style: italic;">"${task.comments}"</div>` : ''}
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>

                    <div style="margin-top: 40px; padding: 24px; background: #f1f5f9; border-radius: 20px; text-align: center;">
                        <p style="color: #64748b; font-size: 14px; margin: 0; font-weight: 600;">
                            Generated by <span style="color: #0f172a; font-weight: 800;">QA Tracker Pro</span> • ${new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            `;

            document.body.appendChild(container);

            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 4,
                logging: false,
                useCORS: true,
            });

            document.body.removeChild(container);

            if (action === 'copy') {
                await copyImageFromCanvas(canvas, `QA Work Status image for ${selectedQA} copied to clipboard!`);
            } else {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `qa_work_status_${selectedQA}_${selectedQADate}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                        alert(`QA Work Status image for ${selectedQA} downloaded successfully!`);
                    } else {
                        alert('Failed to generate image blob');
                    }
                }, 'image/png');
            }
        } catch (error) {
            console.error('Failed to generate QA work status image:', error);
            alert('Failed to generate QA work status image');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const generateScreenshot = async () => {
        setLoading(true);
        try {
            const element = document.querySelector('.xl\\:col-span-2') as HTMLElement || document.querySelector('main') as HTMLElement;
            if (element) {
                const canvas = await html2canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: 4,
                });

                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `tracker_screenshot_${new Date().toISOString().split('T')[0]}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                }, 'image/png');
            }
        } catch (error) {
            console.error('Screenshot failed:', error);
            alert('Failed to generate screenshot');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateTodayWorkStatusClick = () => {
        setPendingImageAction('download');
        setShowHubstaffConfirm(true);
    };

    const handleCopyTodayWorkStatusImageClick = () => {
        setPendingImageAction('copy');
        setShowHubstaffConfirm(true);
    };

    const generateTodayWorkStatus = async (includeHubstaff: boolean, action: 'download' | 'copy' = 'download') => {
        // Do not close confirmation modal immediately
        // setShowHubstaffConfirm(false);

        setLoading(true);
        setHubstaffLoadingState(includeHubstaff ? 'show' : 'hide');
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayTasks = tasks.filter(t => {
                const effectiveStatus = getEffectiveStatus(t);

                // Always include if Overdue, even if outside date range
                if (effectiveStatus === 'Overdue') return true;

                // Include if completed TODAY (even if overdue completed)
                if (effectiveStatus === 'Completed' && t.actualCompletionDate) {
                    const completionDate = new Date(t.actualCompletionDate).toISOString().split('T')[0];
                    if (completionDate === today) return true;
                }

                if (!t.startDate || !t.endDate) return false;
                const start = new Date(t.startDate).toISOString().split('T')[0];
                const end = new Date(t.endDate).toISOString().split('T')[0];
                return today >= start && today <= end;
            });

            // Fetch Hubstaff activity for today only if requested
            let hubstaffData: any = null;
            let hubstaffError: string | null = null;

            if (includeHubstaff) {
                try {
                    const hubstaffResponse = await fetch(`/api/hubstaff?date=${today}`, { cache: 'no-store' });
                    if (hubstaffResponse.ok) {
                        hubstaffData = await hubstaffResponse.json();
                        console.log('Today Work Status - Hubstaff Data:', hubstaffData);
                    } else {
                        const errText = await hubstaffResponse.text();
                        if (hubstaffResponse.status === 429) hubstaffError = "Rate limit reached. Please try again later.";
                        else hubstaffError = `Failed to fetch data (${hubstaffResponse.status})`;
                        console.error('Hubstaff fetch failed:', hubstaffResponse.status, errText);
                    }
                } catch (err) {
                    console.error('Failed to fetch Hubstaff data:', err);
                    hubstaffError = "Network error occurred while fetching Hubstaff data.";
                }
            }

            // TEMPORARY MOCK DATA FOR VERIFICATION


            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.toLocaleString('en-US', { month: 'short' });
                const year = d.getFullYear();
                return `<span>${day}</span><span style="margin: 0 6px;">${month}</span><span>${year}</span>`;
            };

            const formatTime = (seconds: number) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            };

            // Group tasks by assignee (primary assignee)
            // Fix: Include second assignee and additional assignees
            const groupedTasks = todayTasks.reduce((acc, task) => {
                const assignees = new Set<string>();
                if (task.assignedTo) assignees.add(task.assignedTo);
                if (task.assignedTo2) assignees.add(task.assignedTo2);
                if (Array.isArray(task.additionalAssignees)) {
                    task.additionalAssignees.forEach(a => { if (a) assignees.add(a); });
                }

                if (assignees.size === 0) {
                    if (!acc['Unassigned']) acc['Unassigned'] = [];
                    acc['Unassigned'].push(task);
                } else {
                    assignees.forEach(assignee => {
                        if (!acc[assignee]) acc[assignee] = [];
                        acc[assignee].push(task);
                    });
                }
                return acc;
            }, {} as Record<string, typeof todayTasks>);

            // Sort assignees alphabetically, keeping Unassigned last
            const sortedAssignees = Object.keys(groupedTasks).sort((a, b) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return a.localeCompare(b);
            });

            // New Member-Specific Color Logic
            const getMemberColor = (name: string) => {
                const colors = [
                    { border: '#0ea5e9', bg: '#f0f9ff', text: '#0369a1', light: '#e0f2fe' }, // Sky
                    { border: '#ec4899', bg: '#fdf2f8', text: '#be185d', light: '#fce7f3' }, // Pink
                    { border: '#22c55e', bg: '#f0fdf4', text: '#15803d', light: '#dcfce7' }, // Green
                    { border: '#f97316', bg: '#fff7ed', text: '#c2410c', light: '#ffedd5' }, // Orange
                    { border: '#a855f7', bg: '#faf5ff', text: '#7e22ce', light: '#f3e8ff' }, // Purple
                    { border: '#ef4444', bg: '#fef2f2', text: '#b91c1c', light: '#fee2e2' }, // Red
                    { border: '#06b6d4', bg: '#ecfeff', text: '#0891b2', light: '#cffafe' }, // Cyan
                    { border: '#d946ef', bg: '#fdf4ff', text: '#a21caf', light: '#fae8ff' }, // Fuchsia
                    { border: '#eab308', bg: '#fefce8', text: '#a16207', light: '#fef9c3' }, // Yellow
                    { border: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', light: '#ede9fe' }, // Violet
                ];
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                }
                const index = Math.abs(hash) % colors.length;
                return colors[index];
            };

            // Create a temporary container for the report
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 40px; width: 1200px;';

            container.innerHTML = `
                <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: white;">
                    <div style="margin-bottom: 40px; border-bottom: 4px solid #f1f5f9; padding-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <h1 style="color: #0f172a; font-size: 42px; margin: 0 0 8px 0; font-weight: 900; letter-spacing: -1px;">
                                Work Status <span style="color: #64748b; font-weight: 400;">/</span> ${formatDate(today)}
                            </h1>
                            <p style="color: #64748b; font-size: 20px; margin: 0; font-weight: 500;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div style="text-align: right;">
                             <p style="color: #94a3b8; font-size: 14px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Total Capacity</p>
                             <p style="color: #0f172a; font-size: 32px; font-weight: 900; margin: 0;">${todayTasks.length} <span style="font-size: 16px; color: #64748b; font-weight: 600;">Tasks</span></p>
                        </div>
                    </div>
                    
                    ${hubstaffData ? `
                    <!-- Hubstaff Activity Section -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 30px; margin-bottom: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                            <div style="width: 12px; height: 12px; background: #0ea5e9; border-radius: 3px;"></div>
                            <h3 style="color: #0f172a; font-size: 24px; margin: 0; font-weight: 800;">Hubstaff Activity <span style="color: #94a3b8; font-weight: 500; font-size: 18px;">— ${teamName}</span></h3>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        ${(() => {
                        const relevantActivities = hubstaffData.activities.filter((a: any) => {
                            if (a.timeWorked <= 0) return false;
                            const activeAssignees = new Set<string>();
                            todayTasks.forEach(t => {
                                if (t.assignedTo) activeAssignees.add(t.assignedTo.toLowerCase());
                                if (t.assignedTo2) activeAssignees.add(t.assignedTo2.toLowerCase());
                            });
                            const hubName = a.userName.toLowerCase();
                            for (const assignee of activeAssignees) {
                                if (hubName.includes(assignee) || assignee.includes(hubName)) return true;
                            }
                            return false;
                        });

                        if (relevantActivities.length === 0) return `<p style="color: #64748b; grid-column: span 2; font-style: italic;">No activity tracked for active assignees.</p>`;

                        const aggregated = relevantActivities.reduce((acc: any, curr: any) => {
                            if (!acc[curr.userName]) acc[curr.userName] = { userName: curr.userName, timeWorked: 0, activeTimeWorked: 0, weightedActivitySum: 0, projects: new Set() };
                            acc[curr.userName].timeWorked += curr.timeWorked;
                            if (curr.activityPercentage > 0) {
                                acc[curr.userName].weightedActivitySum += (curr.activityPercentage * curr.timeWorked);
                                acc[curr.userName].activeTimeWorked += curr.timeWorked;
                            }
                            if (curr.projectName) acc[curr.userName].projects.add(curr.projectName);
                            return acc;
                        }, {});

                        return Object.values(aggregated).map((user: any) => {
                            const avgActivity = user.activeTimeWorked > 0 ? Math.round(user.weightedActivitySum / user.activeTimeWorked) : 0;
                            const projectList = Array.from(user.projects).join(', ') || 'N/A';
                            return `
                                <div style="background: white; padding: 20px; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <p style="color: #0f172a; font-size: 17px; font-weight: 800; margin: 0 0 4px 0;">${user.userName}</p>
                                        <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 500;">${projectList}</p>
                                    </div>
                                    <div style="display: flex; gap: 24px; text-align: right;">
                                        <div>
                                            <p style="color: #94a3b8; font-size: 11px; margin: 0 0 2px 0; font-weight: 700; text-transform: uppercase;">Worked</p>
                                            <p style="color: #0ea5e9; font-size: 18px; font-weight: 800; margin: 0;">${formatTime(user.timeWorked)}</p>
                                        </div>
                                        <div>
                                            <p style="color: #94a3b8; font-size: 11px; margin: 0 0 2px 0; font-weight: 700; text-transform: uppercase;">Activity</p>
                                            <p style="color: #10b981; font-size: 18px; font-weight: 800; margin: 0;">${avgActivity}%</p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    })()}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; flex-direction: column; gap: 40px;">
                    ${sortedAssignees.map(assignee => {
                        const mColor = getMemberColor(assignee);
                        return `
                        <div style="border: 2px solid ${mColor.border}; border-radius: 24px; overflow: hidden; background: ${mColor.bg}; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                            <!-- Member Header -->
                            <div style="background: white; padding: 20px 30px; border-bottom: 1px solid ${mColor.border}40; display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <div style="width: 44px; height: 44px; background: ${mColor.border}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px;">
                                        ${assignee.charAt(0)}
                                    </div>
                                    <h3 style="color: #0f172a; font-size: 24px; font-weight: 900; margin: 0;">${assignee}</h3>
                                </div>
                                <div style="background: ${mColor.light}; color: ${mColor.text}; padding: 6px 16px; border-radius: 99px; font-size: 14px; font-weight: 800;">
                                    ${groupedTasks[assignee].length} Tasks Assigned
                                </div>
                            </div>

                            <!-- Task Card Grid -->
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; padding: 30px;">
                                ${groupedTasks[assignee].map((task) => {
                                    const effectiveStatus = getEffectiveStatus(task);
                                    let displayStatus = effectiveStatus;
                                    let statusColor = '#64748b';
                                    let statusBg = '#f1f5f9';

                                    if (effectiveStatus === 'Completed') { statusColor = '#059669'; statusBg = '#ecfdf5'; }
                                    else if (effectiveStatus === 'In Progress') { statusColor = '#2563eb'; statusBg = '#eff6ff'; }
                                    else if (effectiveStatus === 'Yet to Start') { statusColor = '#d97706'; statusBg = '#fffbeb'; }
                                    else if (effectiveStatus === 'Overdue') { statusColor = '#dc2626'; statusBg = '#fef2f2'; }

                                    const isLateCompletion = task.status === 'Completed' && task.endDate && task.actualCompletionDate && 
                                        new Date(new Date(task.actualCompletionDate).setHours(0,0,0,0)).getTime() > new Date(new Date(task.endDate).setHours(0,0,0,0)).getTime();
                                    
                                    if (isLateCompletion && task.endDate && task.actualCompletionDate) {
                                        const end = new Date(task.endDate);
                                        const actual = new Date(task.actualCompletionDate);
                                        const e = new Date(end); e.setHours(0, 0, 0, 0);
                                        const a = new Date(actual); a.setHours(0, 0, 0, 0);
                                        const diffDays = Math.ceil((a.getTime() - e.getTime()) / (1000 * 60 * 60 * 24));
                                        if (diffDays > 0) {
                                            displayStatus = `Done (Overdue ${diffDays}d)`;
                                            statusColor = '#991b1b'; statusBg = '#fee2e2';
                                        }
                                    } else if (effectiveStatus === 'Overdue' && task.endDate) {
                                        const end = new Date(task.endDate);
                                        const now = new Date();
                                        end.setHours(23, 59, 59, 999);
                                        now.setHours(0, 0, 0, 0);
                                        const diffDays = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                                        if (diffDays > 0) displayStatus = `Overdue (+${diffDays}d)`;
                                    }

                                    let pColor = '#94a3b8';
                                    if (task.priority === 'High') pColor = '#ef4444';
                                    else if (task.priority === 'Medium') pColor = '#f97316';
                                    else if (task.priority === 'Low') pColor = '#22c55e';

                                    return `
                                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 14px; position: relative;">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                                <div style="color: #0f172a; font-weight: 800; font-size: 16px; flex: 1; line-height: 1.3;">${task.projectName}</div>
                                                <div style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; white-space: nowrap; margin-left: 10px;">${displayStatus}</div>
                                            </div>
                                            
                                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                                <span style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 3px 10px; border-radius: 6px; font-weight: 600; border: 1px solid #f1f5f9;">${task.projectType || 'Project'}</span>
                                                <span style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 3px 10px; border-radius: 6px; font-weight: 600; border: 1px solid #f1f5f9;">${task.subPhase || 'Task'}</span>
                                                ${task.pc ? `<span style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 3px 10px; border-radius: 6px; font-weight: 600; border: 1px solid #f1f5f9;">PC: ${task.pc}</span>` : ''}
                                            </div>

                                            <div style="margin-top: auto; padding-top: 14px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                                <div style="font-size: 12px; color: #475569;">
                                                    <span style="font-weight: 800; color: #1e293b;">S:</span> ${task.startDate ? formatDate(task.startDate) : '-'}
                                                    <span style="margin: 0 4px; color: #e2e8f0;">|</span>
                                                    <span style="font-weight: 800; color: #1e293b;">E:</span> ${task.endDate ? formatDate(task.endDate) : '-'}
                                                </div>
                                                ${task.priority ? `<div style="font-size: 10px; font-weight: 900; color: ${pColor}; text-transform: uppercase; letter-spacing: 0.5px;">${task.priority}</div>` : ''}
                                            </div>
                                            
                                            ${task.comments ? `<div style="font-size: 12px; color: #64748b; line-height: 1.4; background: #f8fafc; padding: 10px; border-radius: 10px; border-left: 3px solid #cbd5e1;">${task.comments}</div>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        `;
                    }).join('')}
                    </div>

                    <div style="margin-top: 50px; padding: 30px; background: #0f172a; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; color: white;">
                        <p style="font-size: 18px; margin: 0; font-weight: 600;">Report Summary</p>
                        <div style="display: flex; gap: 40px;">
                            <div style="text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; font-weight: 700; text-transform: uppercase;">Total Tasks</p>
                                <p style="font-size: 24px; font-weight: 900; margin: 0;">${todayTasks.length}</p>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; font-weight: 700; text-transform: uppercase;">Completed</p>
                                <p style="font-size: 24px; font-weight: 900; margin: 0; color: #10b981;">${todayTasks.filter(t => getEffectiveStatus(t) === 'Completed').length}</p>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; font-weight: 700; text-transform: uppercase;">In Progress</p>
                                <p style="font-size: 24px; font-weight: 900; margin: 0; color: #3b82f6;">${todayTasks.filter(t => getEffectiveStatus(t) === 'In Progress').length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(container);

            // Generate image from the container
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 4,
                logging: false,
                useCORS: true,
            });

            // Remove the temporary container
            document.body.removeChild(container);

            // Download or copy the image
            if (action === 'copy') {
                await copyImageFromCanvas(canvas, "Today's Work Status image copied to clipboard!");
            } else {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `todays_work_status_${today}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                        alert('Today\'s Work Status image downloaded successfully!');
                    } else {
                        alert('Failed to generate image blob');
                    }
                }, 'image/png');
            }
        } catch (error) {
            console.error('Failed to generate work status image:', error);
            alert('Failed to generate work status image');
        } finally {
            setLoading(false);
            setHubstaffLoadingState(null);
            setShowHubstaffConfirm(false);
        }
    };


    const generateTodayWorkStatusText = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t => {
            const effectiveStatus = getEffectiveStatus(t);

            // Include if completed TODAY
            if (effectiveStatus === 'Completed' && t.actualCompletionDate) {
                const completionDate = new Date(t.actualCompletionDate).toISOString().split('T')[0];
                if (completionDate === today) return true;
            }

            if (!t.startDate || !t.endDate) return false;
            const start = new Date(t.startDate).toISOString().split('T')[0];
            const end = new Date(t.endDate).toISOString().split('T')[0];
            return today >= start && today <= end;
        });

        let report = `* Today's Work Status - ${today}*\n\n`;
        report += `*Tasks Scheduled (${todayTasks.length}):*\n`;
        todayTasks.forEach(t => {
            report += `- ${t.projectName} (${t.subPhase || 'N/A'}): ${t.status} - ${t.assignedTo || 'Unassigned'}\n`;
        });

        navigator.clipboard.writeText(report);
        alert('Today&apos;s Work Status text copied to clipboard!');
    };

    const generateWorkScheduleImage = async (action: 'download' | 'copy' = 'download') => {
        setLoading(true);
        try {
            const scheduleTasks = tasks.filter(t => {
                const effectiveStatus = getEffectiveStatus(t);
                if (t.status === 'Completed' || t.status === 'Rejected') return false;
                if (effectiveStatus === 'Overdue') return true;
                if (!t.startDate || !t.endDate) return false;
                const start = new Date(t.startDate).toISOString().split('T')[0];
                const end = new Date(t.endDate).toISOString().split('T')[0];
                return scheduleDate >= start && scheduleDate <= end;
            });

            const dateStr = new Date(scheduleDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.toLocaleString('en-US', { month: 'short' });
                const year = d.getFullYear();
                return `<span>${day}</span><span style="margin: 0 4px;">${month}</span><span>${year}</span>`;
            };

            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 40px; width: 1200px;';

            container.innerHTML = `
                <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: white;">
                    <div style="margin-bottom: 40px; border-bottom: 4px solid #f1f5f9; padding-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <h1 style="color: #0f172a; font-size: 42px; margin: 0 0 8px 0; font-weight: 900; letter-spacing: -1px;">
                                Work Schedule <span style="color: #64748b; font-weight: 400;">/</span> ${(() => {
                                    const d = new Date(scheduleDate);
                                    return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
                                })()}
                            </h1>
                            <p style="color: #64748b; font-size: 20px; margin: 0; font-weight: 500;">${dateStr}</p>
                        </div>
                        <div style="text-align: right;">
                             <p style="color: #94a3b8; font-size: 14px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Active Load</p>
                             <p style="color: #0f172a; font-size: 32px; font-weight: 900; margin: 0;">${scheduleTasks.length} <span style="font-size: 16px; color: #64748b; font-weight: 600;">Tasks</span></p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
                        ${scheduleTasks.length === 0 ?
                            '<div style="grid-column: span 2; padding: 60px; text-align: center; color: #94a3b8; font-size: 18px; font-weight: 500; background: #f8fafc; border-radius: 20px;">No active tasks found in schedule</div>' :
                            scheduleTasks.map((task) => {
                                const effectiveStatus = getEffectiveStatus(task);
                                let displayStatus = effectiveStatus;
                                let statusColor = '#64748b';
                                let statusBg = '#f1f5f9';

                                if (effectiveStatus === 'In Progress') { statusColor = '#2563eb'; statusBg = '#eff6ff'; }
                                else if (effectiveStatus === 'Yet to Start') { statusColor = '#d97706'; statusBg = '#fffbeb'; }
                                else if (effectiveStatus === 'Overdue') { statusColor = '#dc2626'; statusBg = '#fef2f2'; }

                                if (effectiveStatus === 'Overdue' && task.endDate) {
                                    const end = new Date(task.endDate);
                                    const now = new Date();
                                    end.setHours(0, 0, 0, 0);
                                    now.setHours(0, 0, 0, 0);
                                    const diffDays = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays > 0) displayStatus = `Overdue (+${diffDays}d)`;
                                }

                                let pColor = '#94a3b8';
                                if (task.priority === 'High') pColor = '#ef4444';
                                else if (task.priority === 'Medium') pColor = '#f97316';
                                else if (task.priority === 'Low') pColor = '#22c55e';

                                return `
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <div style="color: #0f172a; font-weight: 800; font-size: 18px; flex: 1; line-height: 1.3;">${task.projectName}</div>
                                            <div style="background: ${statusBg}; color: ${statusColor}; padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; white-space: nowrap; margin-left: 15px;">${displayStatus}</div>
                                        </div>
                                        
                                        <div style="display: flex; flex-direction: column; gap: 8px;">
                                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                                <span style="font-size: 13px; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 8px; font-weight: 600;">${task.projectType || 'Project'}</span>
                                                <span style="font-size: 13px; color: #475569; background: #f1f5f9; padding: 4px 12px; border-radius: 8px; font-weight: 600;">${task.subPhase || 'Task'}</span>
                                            </div>
                                            <div style="font-size: 13px; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                                                <div style="width: 8px; height: 8px; background: #94a3b8; border-radius: 50%;"></div>
                                                Assignees: ${[task.assignedTo, task.assignedTo2, ...(task.additionalAssignees || [])].filter(Boolean).join(', ') || 'Unassigned'}
                                            </div>
                                        </div>

                                        <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                            <div style="font-size: 13px; color: #475569;">
                                                <span style="font-weight: 800; color: #0f172a;">Timeline:</span> ${task.startDate ? formatDate(task.startDate) : 'TBD'} - ${task.endDate ? formatDate(task.endDate) : 'TBD'}
                                            </div>
                                            ${task.priority ? `<div style="font-size: 11px; font-weight: 900; color: ${pColor}; text-transform: uppercase; letter-spacing: 0.5px;">${task.priority}</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>

                    <div style="margin-top: 40px; padding: 24px; background: #0f172a; border-radius: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 14px; margin: 0; font-weight: 600;">
                            Generated by <span style="color: #ffffff; font-weight: 800;">QA Tracker Pro</span> • Planned for Productivity
                        </p>
                    </div>
                </div>
            `;

            document.body.appendChild(container);

            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 4,
                logging: false,
                useCORS: true,
            });

            document.body.removeChild(container);

            if (action === 'copy') {
                await copyImageFromCanvas(canvas, 'Work Schedule image copied to clipboard!');
            } else {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `work_schedule_preview_${new Date().toISOString().split('T')[0]}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                        alert('Work Schedule image downloaded successfully!');
                    }
                }, 'image/png');
            }

        } catch (error) {
            console.error('Failed to generate schedule image:', error);
            alert('Failed to generate schedule image');
        } finally {
            setLoading(false);
        }
    };

    const generateWorkSchedule = () => {
        alert('Work Schedule preview feature coming soon!');
    };

    const generateWorkScheduleText = () => {
        const scheduleTasks = tasks.filter(t => {
            const effectiveStatus = getEffectiveStatus(t);
            // Exclude if capped
            if (t.status === 'Completed' || t.status === 'Rejected') return false;
            // Include if overdue
            if (effectiveStatus === 'Overdue') return true;
            // Check date
            if (!t.startDate || !t.endDate) return false;
            const start = new Date(t.startDate).toISOString().split('T')[0];
            const end = new Date(t.endDate).toISOString().split('T')[0];
            return scheduleDate >= start && scheduleDate <= end;
        });

        let report = `*Work Schedule - ${scheduleDate}*\n\n`;
        scheduleTasks.forEach(t => {
            const start = t.startDate ? new Date(t.startDate).toLocaleDateString() : 'TBD';
            const end = t.endDate ? new Date(t.endDate).toLocaleDateString() : 'TBD';
            report += `${t.projectName}\n`;
            report += `  Phase: ${t.subPhase || 'N/A'}\n`;
            report += `  Status: ${getEffectiveStatus(t)}\n`;
            report += `  Assignee: ${t.assignedTo || 'Unassigned'}${t.assignedTo2 ? `, ${t.assignedTo2}` : ''}\n`;
            report += `  Timeline: ${start} - ${end}\n\n`;
        });

        navigator.clipboard.writeText(report);
        alert('Work Schedule Text copied to clipboard!');
    };

    const generateForecastImage = async (action: 'download' | 'copy' = 'download') => {
        setLoading(true);
        try {
            // Filter forecast tasks
            const forecastTasks = tasks.filter(t => t.status === 'Forecast');

            // Sort by priority and project name
            const sortedTasks = forecastTasks.sort((a, b) => {
                const priorityOrder: Record<string, number> = {
                    'High': 1,
                    'Medium': 2,
                    'Low': 3
                };
                const aPriority = priorityOrder[a.priority || ''] || 999;
                const bPriority = priorityOrder[b.priority || ''] || 999;

                if (aPriority !== bPriority) return aPriority - bPriority;
                return (a.projectName || '').localeCompare(b.projectName || '');
            });

            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.toLocaleString('en-US', { month: 'short' });
                const year = d.getFullYear();
                return `${day} ${month} ${year}`;
            };

            const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            // Create container
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 30px;';

            container.innerHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 1400px; padding: 40px; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; border-bottom: 3px solid #cbd5e1; padding-bottom: 24px;">
                        <div>
                            <h1 style="color: #0f172a; font-size: 36px; margin-bottom: 12px; font-weight: 800; display: block; font-family: Arial, sans-serif;">
                                <span style="display: inline-block; margin-right: 10px;">Forecast</span><span style="display: inline-block; margin-right: 10px;">Projects</span><span style="display: inline-block; margin-right: 10px;">-</span><span style="display: inline-block;">${teamName}</span>
                            </h1>
                            <p style="color: #334155; font-size: 18px; margin: 0; font-weight: 500;">${currentDate}</p>
                        </div>
                        <div style="text-align: right;">
                             <p style="color: #475569; font-size: 16px; margin: 0; font-weight: 500;">Total Forecast Projects</p>
                             <p style="color: #0f172a; font-size: 28px; font-weight: 700; margin: 0;">${sortedTasks.length}</p>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: white; border: 1px solid #64748b; border-radius: 12px; overflow: hidden;">
                        <thead>
                            <tr style="background: #0f172a;">
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 15px; width: 22%; border-right: 1px solid #334155;">Project</th>
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 15px; width: 10%; border-right: 1px solid #334155;">Type</th>
                                <th style="padding: 16px; text-align: center; color: white; font-weight: 700; font-size: 15px; width: 8%; border-right: 1px solid #334155;">Priority</th>
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 15px; width: 15%; border-right: 1px solid #334155;">Phase</th>
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 15px; width: 10%; border-right: 1px solid #334155;">PC</th>
                                <th style="padding: 16px; text-align: center; color: white; font-weight: 700; font-size: 15px; width: 10%; border-right: 1px solid #334155;">Status</th>
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 15px;">Timeline</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedTasks.length === 0 ?
                    '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #64748b; font-size: 18px; font-weight: 500;">No forecast projects found</td></tr>' :
                    sortedTasks.map((task, index) => {
                        return `
                                    <tr style="border-bottom: 1px solid #cbd5e1; ${index % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}">
                                        <td style="padding: 16px; color: #0f172a; font-weight: 600; font-size: 15px; vertical-align: middle; border-right: 1px solid #cbd5e1;">
                                            ${task.projectName || '-'}
                                        </td>
                                        <td style="padding: 16px; color: #334155; font-size: 14px; vertical-align: middle; border-right: 1px solid #cbd5e1; font-weight: 500;">
                                            ${task.projectType || '-'}
                                        </td>
                                        <td style="padding: 16px; text-align: center; vertical-align: middle; border-right: 1px solid #cbd5e1;">
                                            ${(() => {
                                if (!task.priority) return '<span style="color: #64748b; font-size: 14px;">-</span>';
                                let pColor = '#64748b';
                                if (task.priority === 'High') pColor = '#dc2626';
                                else if (task.priority === 'Medium') pColor = '#ea580c';
                                else if (task.priority === 'Low') pColor = '#16a34a';
                                return `<span style="font-size: 13px; font-weight: 700; color: ${pColor}; text-transform: uppercase; letter-spacing: 0.5px;">${task.priority}</span>`;
                            })()}
                                        </td>
                                        <td style="padding: 16px; color: #334155; font-size: 14px; vertical-align: middle; border-right: 1px solid #cbd5e1; font-weight: 500;">
                                            ${task.subPhase || '-'}
                                        </td>
                                        <td style="padding: 16px; color: #334155; font-size: 14px; vertical-align: middle; border-right: 1px solid #cbd5e1; font-weight: 500;">
                                            ${task.pc || '-'}
                                        </td>
                                        <td style="padding: 16px; text-align: center; vertical-align: middle; border-right: 1px solid #cbd5e1;">
                                            <span style="font-size: 14px; font-weight: 800; color: #7c3aed;">
                                                Forecast
                                            </span>
                                        </td>
                                        <td style="padding: 16px; color: #334155; font-size: 14px; vertical-align: middle;">${task.startDate ? formatDate(task.startDate) : 'TBD'} - ${task.endDate ? formatDate(task.endDate) : 'TBD'}</td>
                                    </tr>
        `;
                    }).join('')
                }
                        </tbody>
                    </table>
                </div>
            `;

            document.body.appendChild(container);

            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 4,
                logging: false,
            });

            document.body.removeChild(container);

            if (action === 'copy') {
                await copyImageFromCanvas(canvas, 'Forecast Projects image copied to clipboard!');
            } else {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        setPreviewImage(url);
                        setPreviewTitle(`Forecast_Projects_${new Date().toISOString().split('T')[0]}`);
                    }
                }, 'image/png');
            }

        } catch (error) {
            console.error('Failed to generate forecast image:', error);
            alert('Failed to generate forecast image');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 rounded-xl">
                            <FileText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Generate Daily Report</h2>
                            <p className="text-sm text-slate-500">Choose a report type to generate and download</p>
                        </div>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {/* Content - List Style */}
                <div className="p-4 pb-10 md:p-6 space-y-3">

                    {/* Tracker Screenshot */}
                    {/* Tracker Screenshot - HIDDEN AS REQUESTED */}
                    {/* <button
                        onClick={generateScreenshot}
                        disabled={loading}
                        className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all duration-200 group text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Camera className="text-white" size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">Tracker Table Screenshot</h3>
                            <p className="text-sm text-slate-500">Generate a screenshot of the current tracker table with all active projects</p>
                        </div>
                        <ChevronRight className="text-slate-400 group-hover:text-sky-500 transition-colors" size={20} />
                        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>}
                    </button> */}

                    {/* Today's Work Status - Expandable */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'today' ? null : 'today')}
                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-all duration-200 group text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-500 flex items-center justify-center flex-shrink-0">
                                <FileText className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">Today&apos;s Work Status</h3>
                                <p className="text-sm text-slate-500">Create a report showing all tasks scheduled for today</p>
                            </div>
                            <ChevronRight className={`text-slate-400 group-hover:text-sky-500 transition-all ${expandedSection === 'today' ? 'rotate-90' : ''}`} size={20} />
                        </button>

                        {expandedSection === 'today' && (
                            <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2">
                                <ReportActions
                                    onDownload={handleGenerateTodayWorkStatusClick}
                                    onCopyImage={handleCopyTodayWorkStatusImageClick}
                                    onCopy={generateTodayWorkStatusText}
                                    loading={loading}
                                />
                            </div>
                        )}
                    </div>

                    {/* Work Schedule - Expandable */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'schedule' ? null : 'schedule')}
                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-all duration-200 group text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                                <Calendar className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">Work Schedule</h3>
                                <p className="text-sm text-slate-500">Generate a preview of work schedule for a specific date</p>
                            </div>
                            <ChevronRight className={`text-slate-400 group-hover:text-sky-500 transition-all ${expandedSection === 'schedule' ? 'rotate-90' : ''}`} size={20} />
                        </button>

                        {expandedSection === 'schedule' && (
                            <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                                {/* Date Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Select Schedule Date
                                    </label>
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm dark:[color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <ReportActions
                                        onDownload={() => generateWorkScheduleImage('download')}
                                        onCopyImage={() => generateWorkScheduleImage('copy')}
                                        onCopy={generateWorkScheduleText}
                                        loading={loading}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Forecast Projects - Expandable */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'forecast' ? null : 'forecast')}
                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-all duration-200 group text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                                <Calendar className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">Forecast Projects</h3>
                                <p className="text-sm text-slate-500">Generate an image showing all forecast projects</p>
                            </div>
                            <ChevronRight className={`text-slate-400 group-hover:text-sky-500 transition-all ${expandedSection === 'forecast' ? 'rotate-90' : ''}`} size={20} />
                        </button>

                        {expandedSection === 'forecast' && (
                            <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2">
                                <ReportActions
                                    onDownload={() => generateForecastImage('download')}
                                    onCopyImage={() => generateForecastImage('copy')}
                                    onCopy={() => alert('Text copy is not available for Forecast Projects. Use Download or Copy Image instead.')}
                                    copyLabel="Copy as Text (N/A)"
                                    loading={loading}
                                />
                            </div>
                        )}
                    </div>

                    {/* QA Work Status - Expandable */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'qa-status' ? null : 'qa-status')}
                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-all duration-200 group text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                <ClipboardList className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">Work Status</h3>
                                <p className="text-sm text-slate-500">Generate work status report for a specific member</p>
                            </div>
                            <ChevronRight className={`text-slate-400 group-hover:text-sky-500 transition-all ${expandedSection === 'qa-status' ? 'rotate-90' : ''}`} size={20} />
                        </button>

                        {expandedSection === 'qa-status' && (
                            <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                                {/* Member Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Select Member
                                    </label>
                                    <Combobox
                                        options={teamMembers.map(m => ({ id: m.name, label: m.name }))}
                                        value={selectedQA}
                                        onChange={(val) => setSelectedQA(val as string)}
                                        placeholder="Choose a Member..."
                                        searchPlaceholder="Search member..."
                                        className="w-full"
                                    />
                                </div>


                                {/* Date Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Select Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedQADate}
                                        onChange={(e) => setSelectedQADate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm dark:[color-scheme:dark]"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2">
                                    <ReportActions
                                        onDownload={() => generateQAWorkStatusImage('download')}
                                        onCopyImage={() => generateQAWorkStatusImage('copy')}
                                        onCopy={generateQAWorkStatusText}
                                        loading={loading}
                                        disabled={!selectedQA}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm"
                    >
                        Close
                    </button>
                </div>

            </div >

            {/* Hubstaff Confirmation Modal */}
            {
                showHubstaffConfirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                            <div className="text-center mb-6">
                                <div className="mx-auto w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="text-sky-600" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Include Hubstaff Activity?</h3>
                                <p className="text-sm text-slate-500">
                                    Would you like to display the Hubstaff activity section in the generated image?
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => generateTodayWorkStatus(false, pendingImageAction)}
                                    disabled={hubstaffLoadingState !== null}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {hubstaffLoadingState === 'hide' && <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>}
                                    No, Hide It
                                </button>
                                <button
                                    onClick={() => generateTodayWorkStatus(true, pendingImageAction)}
                                    disabled={hubstaffLoadingState !== null}
                                    className="btn btn-info flex-1 flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {hubstaffLoadingState === 'show' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Yes, Show
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <Eye className="text-sky-600" size={20} /> Preview Report
                                </h3>
                                <CloseButton onClick={() => {
                                    setPreviewImage(null);
                                    if (previewImage) URL.revokeObjectURL(previewImage);
                                }} />
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center custom-scrollbar">
                                <img src={previewImage} alt="Report Preview" className="max-w-full h-auto shadow-lg rounded-lg border border-slate-200" />
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-2xl">
                                <button
                                    onClick={() => {
                                        setPreviewImage(null);
                                        if (previewImage) URL.revokeObjectURL(previewImage);
                                    }}
                                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!previewImage) return;
                                        try {
                                            const res = await fetch(previewImage);
                                            const blob = await res.blob();
                                            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                            alert('Image copied to clipboard!');
                                        } catch (err) {
                                            console.error('Copy image failed:', err);
                                            alert('Copy image is not supported in this browser. Please use the Download button instead.');
                                        }
                                    }}
                                    className="px-5 py-2.5 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-200 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Copy size={18} /> Copy Image
                                </button>
                                <a
                                    href={previewImage}
                                    download={`${previewTitle || 'report'}.png`}
                                    className="px-5 py-2.5 bg-sky-600 text-white font-medium hover:bg-sky-700 rounded-xl shadow-lg shadow-sky-200 flex items-center gap-2 transition-all active:scale-95"
                                    onClick={() => {
                                        // Optional: Close after download
                                    }}
                                >
                                    <Download size={18} /> Download Image
                                </a>
                            </div>
                        </div>
                    </div >
                )
            }
        </div >
    );
}
