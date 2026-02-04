/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { X, Camera, FileText, Calendar, ClipboardList, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';

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
    const [scheduleDate, setScheduleDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });

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
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

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

    const generateQAWorkStatusImage = async () => {
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

            // Create a temporary container for the image
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 30px;';

            const formatTime = (seconds: number) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            };

            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            };

            container.innerHTML = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px;">
                    <h1 style="color: #0ea5e9; font-size: 28px; margin-bottom: 8px; font-weight: 700;">QA Work Status - ${selectedQA}</h1>
                    <p style="color: #64748b; font-size: 16px; margin-bottom: 24px;">${formatDate(selectedQADate)}</p>
                    
                    <!-- Hubstaff Activity Section -->
                    <div style="background: #f8fafc; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
                        <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 12px; font-weight: 600;">Hubstaff Activity</h3>
                        <p style="color: #475569; margin: 4px 0;"><strong>Time Worked:</strong> ${formatTime(qaData.hubstaffActivity.timeWorked)}</p>
                        <p style="color: #475569; margin: 4px 0;"><strong>Activity Level:</strong> ${qaData.hubstaffActivity.activityPercentage}%</p>
                        ${qaData.hubstaffActivity.projects.length > 0 ? `<p style="color: #475569; margin: 4px 0;"><strong>Projects:</strong> ${qaData.hubstaffActivity.projects.join(', ')}</p>` : ''}
                    </div>

                    <!-- Tasks Table -->
                    <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <thead>
                            <tr style="background: linear-gradient(to right, #0ea5e9, #6366f1);">
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-size: 14px; border-right: 1px solid rgba(255,255,255,0.2);">Project</th>
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-size: 14px; border-right: 1px solid rgba(255,255,255,0.2);">Phase</th>
                                <th style="padding: 16px; text-align: center; color: white; font-weight: 600; font-size: 14px; border-right: 1px solid rgba(255,255,255,0.2);">Status</th>
                                <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-size: 14px;">Timeline</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${qaData.tasks.length === 0 ?
                    '<tr><td colspan="4" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 16px;">No tasks scheduled for this date</td></tr>' :
                    qaData.tasks.map((task: any, index: number) => `
                                    <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}">
                                        <td style="padding: 16px; color: #1e293b; font-weight: 600; font-size: 14px; border-right: 1px solid #f1f5f9;">${task.projectName}</td>
                                        <td style="padding: 16px; color: #475569; font-size: 14px; border-right: 1px solid #f1f5f9;">${task.subPhase || 'N/A'}</td>
                                        <td style="padding: 16px; text-align: center; border-right: 1px solid #f1f5f9;">
                                            <span style="display: inline-flex; align-items: center; justify-content: center; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; min-width: 120px; height: 32px;
                                                ${task.status === 'Completed' ? 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;' :
                            task.status === 'In Progress' ? 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;' :
                                task.status === 'Yet to Start' ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;' :
                                    'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;'}">
                                                ${task.status}
                                            </span>
                                        </td>
                                        <td style="padding: 16px; color: #475569; font-size: 14px;">${task.startDate ? formatDate(task.startDate) : 'TBD'} - ${task.endDate ? formatDate(task.endDate) : 'TBD'}</td>
                                    </tr>
                                `).join('')
                }
                        </tbody>
                    </table>
                </div>
            `;

            document.body.appendChild(container);

            // Generate image from the container
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 4,
                logging: false,
            });

            // Remove the temporary container
            document.body.removeChild(container);

            // Download the image
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

    const generateTodayWorkStatus = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayTasks = tasks.filter(t => {
                const effectiveStatus = getEffectiveStatus(t);

                // Always include if Overdue, even if outside date range
                if (effectiveStatus === 'Overdue') return true;

                if (!t.startDate || !t.endDate) return false;
                const start = new Date(t.startDate).toISOString().split('T')[0];
                const end = new Date(t.endDate).toISOString().split('T')[0];
                return today >= start && today <= end;
            });

            // Fetch Hubstaff activity for today
            let hubstaffData: any = null;
            let hubstaffError: string | null = null;
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

            // TEMPORARY MOCK DATA FOR VERIFICATION


            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.toLocaleString('en-US', { month: 'short' });
                const year = d.getFullYear();
                return `${day} ${month} ${year}`;
            };

            const formatTime = (seconds: number) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            };

            // Create a temporary container for the table
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 30px;';

            container.innerHTML = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px;">
                    <h1 style="color: #0ea5e9; font-size: 28px; margin-bottom: 8px; font-weight: 700;">Today's Work Status</h1>
                    <p style="color: #64748b; font-size: 16px; margin-bottom: 24px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    
                    ${hubstaffData ? `
                    <!-- Hubstaff Activity Section - Dynamic Team -->
                    <div style="background: #f8fafc; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
                        <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 16px; font-weight: 600;">Hubstaff Activity - ${teamName}</h3>
                        ${(() => {
                        // Filter activities (exclude 0% or empty)
                        const relevantActivities = hubstaffData.activities.filter((a: any) => {
                            // 1. Must have time worked
                            if (a.timeWorked <= 0) return false;

                            // 2. Must be one of the assignees in today's tasks OR a known team member
                            // (We use a dynamic list based on the tasks visible to this user)
                            const activeAssignees = new Set<string>();
                            todayTasks.forEach(t => {
                                if (t.assignedTo) activeAssignees.add(t.assignedTo.toLowerCase());
                                if (t.assignedTo2) activeAssignees.add(t.assignedTo2.toLowerCase());
                            });

                            // Check if Hubstaff name matches any assignee (loosely)
                            // Ideally we have a robust mapping, but exact name or 'includes' helps
                            // Hubstaff Name: "Aswathi M Ashok" -> Assignee might be "Aswathi"
                            // We check if the Hubstaff user's name *contains* the assignee name (or vice versa)
                            // But 'assignedTo' in our DB is often the Short Name (e.g. "Aswathi").
                            // Hubstaff is Full Name.

                            // Better: Check if any assignee name is found in the Hubstaff User Name
                            const hubName = a.userName.toLowerCase();
                            for (const assignee of activeAssignees) {
                                // Simple inclusion check: "aswathi" in "aswathi m ashok"
                                if (hubName.includes(assignee)) return true;
                                // Reverse: "sreegith va" (hub) vs "sreegith" (db)
                                if (assignee.includes(hubName)) return true;
                            }
                            return false;
                        });

                        if (relevantActivities.length === 0) {
                            // If filtering removed everyone, show a helpful message
                            const activeAssignees = Array.from(new Set(todayTasks.map(t => t.assignedTo).filter(Boolean))).join(', ');
                            return `<p style="color: #64748b; font-size: 14px; margin: 0;">No Hubstaff activity found for active assignees (${activeAssignees || 'None'}).</p>`;
                        }

                        // Aggregate activities by user
                        const aggregatedActivities = relevantActivities.reduce((acc: any, curr: any) => {
                            if (!acc[curr.userName]) {
                                acc[curr.userName] = {
                                    userName: curr.userName,
                                    timeWorked: 0,
                                    activeTimeWorked: 0,
                                    weightedActivitySum: 0,
                                    projects: new Set()
                                };
                            }
                            acc[curr.userName].timeWorked += curr.timeWorked;

                            // Only include non-zero activity in the average calculation
                            if (curr.activityPercentage > 0) {
                                acc[curr.userName].weightedActivitySum += (curr.activityPercentage * curr.timeWorked);
                                acc[curr.userName].activeTimeWorked += curr.timeWorked;
                            }

                            if (curr.projectName) {
                                acc[curr.userName].projects.add(curr.projectName);
                            }
                            return acc;
                        }, {});

                        return Object.values(aggregatedActivities).map((user: any) => {
                            // Calculate average based on ACTIVE time only
                            const avgActivity = user.activeTimeWorked > 0
                                ? Math.round(user.weightedActivitySum / user.activeTimeWorked)
                                : 0;
                            const projectList = Array.from(user.projects).join(' / ') || 'N/A';

                            return `
                                    <div style="background: white; padding: 12px; margin-bottom: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0;">${user.userName}</p>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                            <div>
                                                <p style="color: #64748b; font-size: 11px; margin: 0 0 2px 0;">Time Worked</p>
                                                <p style="color: #0ea5e9; font-size: 16px; font-weight: 600; margin: 0;">${formatTime(user.timeWorked)}</p>
                                            </div>
                                            <div>
                                                <p style="color: #64748b; font-size: 11px; margin: 0 0 2px 0;">Activity</p>
                                                <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">${avgActivity}%</p>
                                            </div>
                                            <div>
                                                <p style="color: #64748b; font-size: 11px; margin: 0 0 2px 0;">Project</p>
                                                <p style="color: #475569; font-size: 13px; font-weight: 500; margin: 0;">${projectList}</p>
                                            </div>
                                        </div>
                                    </div>
                                `}).join('');
                    })()}
                    </div>
                    ` : ''}
                    
                    <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <thead>
                            <tr style="background: linear-gradient(to right, #0ea5e9, #6366f1);">
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; width: 15%; border-right: 1px solid rgba(255,255,255,0.2);">Project & Type</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.2);">Phase & PC</th>
                                <th style="padding: 12px; text-align: center; color: white; font-weight: 600; font-size: 12px; width: 10%; border-right: 1px solid rgba(255,255,255,0.2);">Status</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; width: 15%; border-right: 1px solid rgba(255,255,255,0.2);">Assignees</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.2);">Dates (S/E/A)</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px;">Comments/Dev.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayTasks.length === 0 ?
                    '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 16px;">No tasks scheduled for today</td></tr>' :
                    todayTasks.map((task, index) => {
                        const isLateCompletion = task.status === 'Completed' && task.endDate && task.actualCompletionDate && new Date(task.actualCompletionDate) > new Date(task.endDate);

                        let lateLabel = 'Completed (Overdue)';
                        if (isLateCompletion && task.endDate && task.actualCompletionDate) {
                            const end = new Date(task.endDate);
                            const actual = new Date(task.actualCompletionDate);
                            // Set to end of days to be safe or just use raw dates if they are date strings.
                            // Assuming YYYY-MM-DD
                            const e = new Date(end); e.setHours(0, 0, 0, 0);
                            const a = new Date(actual); a.setHours(0, 0, 0, 0);

                            const diffTime = a.getTime() - e.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            lateLabel = `Completed (Overdue ${diffDays}d)`;
                        }

                        const effectiveStatus = getEffectiveStatus(task);
                        return `
                                    <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}">
                                        <td style="padding: 12px; color: #1e293b; font-weight: 600; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            <div>${task.projectName}</div>
                                            <div style="color: #64748b; font-size: 11px; font-weight: 400;">${task.projectType || '-'}</div>
                                            ${task.priority ? `<div style="margin-top:4px; display:inline-block; padding:2px 6px; background:#f1f5f9; border-radius:4px; font-size:10px;">${task.priority}</div>` : ''}
                                        </td>
                                        <td style="padding: 12px; color: #475569; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            <div>${task.subPhase || 'N/A'}</div>
                                            <div style="color: #94a3b8; font-size: 11px;">PC: ${task.pc || '-'}</div>
                                        </td>
                                    <td style="padding: 12px; text-align: center; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                            <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 100px; height: 26px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap; padding-bottom: 1px; padding-left: 8px; padding-right: 8px;
                                                ${effectiveStatus === 'Completed' ? 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;' :
                                effectiveStatus === 'In Progress' ? 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;' :
                                    effectiveStatus === 'Yet to Start' ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;' :
                                        effectiveStatus === 'Overdue' ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;' :
                                            'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;'}
                                                ${isLateCompletion ? 'border: 2px solid #f87171;' : ''}">
                                                ${isLateCompletion ? lateLabel : effectiveStatus}
                                            </span>
                                        </div>
                                    </td>
                                        <td style="padding: 12px; color: #475569; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            ${[task.assignedTo, task.assignedTo2, ...(task.additionalAssignees || [])].filter(Boolean).join(', ') || 'Unassigned'}
                                        </td>
                                        <td style="padding: 12px; color: #475569; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            <div>S: ${task.startDate ? formatDate(task.startDate) : '-'}</div>
                                            <div>E: ${task.endDate ? formatDate(task.endDate) : '-'}</div>
                                            ${task.actualCompletionDate ? `<div style="color:#059669;">A: ${formatDate(task.actualCompletionDate)}</div>` : ''}
                                        </td>
                                        <td style="padding: 12px; color: #64748b; font-size: 11px; vertical-align: middle;">
                                            <div style="margin-bottom:4px;">${task.comments || '-'}</div>
                                            ${'' /* Deviation reason hidden as requested */}
                                            ${task.sprintLink ? `<div style="color:#3b82f6;">Sprint Link Available</div>` : ''}
                                        </td>
                                    </tr>
        `;
                    }).join('')
                }
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                        <p style="color: #64748b; font-size: 14px; margin: 0;">
                            <strong style="color: #1e293b;">Total Tasks Scheduled:</strong> ${todayTasks.length}
                        </p>
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
            });

            // Remove the temporary container
            document.body.removeChild(container);

            // Download the image using blob for better compatibility
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
        } catch (error) {
            console.error('Failed to generate work status image:', error);
            alert('Failed to generate work status image');
        } finally {
            setLoading(false);
        }
    };

    const generateTodayWorkStatusText = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t => {
            if (!t.startDate || !t.endDate) return false;
            const start = new Date(t.startDate).toISOString().split('T')[0];
            const end = new Date(t.endDate).toISOString().split('T')[0];
            return today >= start && today <= end;
        });

        let report = `*Today's Work Status - ${today}*\n\n`;
        report += `*Tasks Scheduled (${todayTasks.length}):*\n`;
        todayTasks.forEach(t => {
            report += `- ${t.projectName} (${t.subPhase || 'N/A'}): ${t.status} - ${t.assignedTo || 'Unassigned'}\n`;
        });

        navigator.clipboard.writeText(report);
        alert('Today&apos;s Work Status text copied to clipboard!');
    };

    const generateWorkScheduleImage = async () => {
        setLoading(true);
        try {
            const scheduleTasks = tasks.filter(t => {
                const effectiveStatus = getEffectiveStatus(t);

                // Exclude if completed/rejected
                if (t.status === 'Completed' || t.status === 'Rejected') return false;

                // If overdue, always include it (as per user request: "if not marked completed... should remain overdue")
                if (effectiveStatus === 'Overdue') return true;

                // Otherwise check date range
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
                return `${day} ${month} ${year}`;
            };

            // Create container
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 30px;';

            container.innerHTML = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                        <div>
                            <h1 style="color: #0ea5e9; font-size: 28px; margin-bottom: 8px; font-weight: 700;">Work Schedule</h1>
                            <p style="color: #64748b; font-size: 16px; margin: 0;">Report Date: ${dateStr}</p>
                        </div>
                        <div style="text-align: right;">
                             <p style="color: #64748b; font-size: 14px; margin: 0;">Total Active Tasks</p>
                             <p style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">${scheduleTasks.length}</p>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <thead>
                            <tr style="background: linear-gradient(to right, #0ea5e9, #6366f1);">
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; width: 20%; border-right: 1px solid rgba(255,255,255,0.2);">Project Details</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.2);">Phase & PC</th>
                                <th style="padding: 12px; text-align: center; color: white; font-weight: 600; font-size: 12px; width: 10%; border-right: 1px solid rgba(255,255,255,0.2);">Status</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; width: 15%; border-right: 1px solid rgba(255,255,255,0.2);">Assignees</th>
                                <th style="padding: 12px; text-align: left; color: white; font-weight: 600; font-size: 12px; vertical-align: middle; border-right: 1px solid rgba(255,255,255,0.2);">Timeline</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${scheduleTasks.length === 0 ?
                    '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 16px;">No active tasks found in schedule</td></tr>' :
                    scheduleTasks.map((task, index) => `
                                    <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}">
                                        <td style="padding: 12px; color: #1e293b; font-weight: 600; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            <div>${task.projectName}</div>
                                            <div style="color: #64748b; font-size: 11px; font-weight: 400;">${task.projectType || '-'}</div>
                                            ${task.priority ? `<div style="margin-top:4px; display:inline-block; padding:2px 6px; background:#f1f5f9; border-radius:4px; font-size:10px;">${task.priority}</div>` : ''}
                                        </td>
                                        <td style="padding: 12px; color: #475569; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            <div>${task.subPhase || '-'}</div>
                                            <div style="color: #94a3b8; font-size: 11px;">PC: ${task.pc || '-'}</div>
                                        </td>
                                        <td style="padding: 12px; text-align: center; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 100px; height: 26px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap; padding-bottom: 1px;
                                                    ${getEffectiveStatus(task) === 'In Progress' ? 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;' :
                            getEffectiveStatus(task) === 'Yet to Start' ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;' :
                                getEffectiveStatus(task) === 'On Hold' ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;' :
                                    getEffectiveStatus(task) === 'Overdue' ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;' :
                                        'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;'}">
                                                    ${getEffectiveStatus(task)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style="padding: 12px; color: #475569; font-size: 12px; vertical-align: middle; border-right: 1px solid #f1f5f9;">
                                            ${[task.assignedTo, task.assignedTo2, ...(task.additionalAssignees || [])].filter(Boolean).join(', ') || 'Unassigned'}
                                        </td>
                                        <td style="padding: 12px; color: #475569; font-size: 12px; vertical-align: middle;">${task.startDate ? formatDate(task.startDate) : 'TBD'} - ${task.endDate ? formatDate(task.endDate) : 'TBD'}</td>
                                    </tr>
                                `).join('')
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
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - List Style */}
                <div className="p-4 pb-10 md:p-6 space-y-3">

                    {/* Tracker Screenshot */}
                    <button
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
                    </button>

                    {/* Today's Work Status - Expandable */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'today' ? null : 'today')}
                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 transition-all duration-200 group text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
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
                                <button
                                    onClick={generateTodayWorkStatus}
                                    disabled={loading}
                                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg transition-all text-left"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Camera className="text-sky-600" size={18} />
                                    )}
                                    <span className="text-sm font-medium text-slate-700">{loading ? 'Generating...' : 'Download as Image'}</span>
                                </button>
                                <button
                                    onClick={generateTodayWorkStatusText}
                                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg transition-all text-left"
                                >
                                    <ClipboardList className="text-sky-600" size={18} />
                                    <span className="text-sm font-medium text-slate-700">Copy as Text</span>
                                </button>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Select Schedule Date
                                    </label>
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <button
                                        onClick={generateWorkScheduleImage}
                                        disabled={loading}
                                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg transition-all text-left"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Camera className="text-sky-600" size={18} />
                                        )}
                                        <span className="text-sm font-medium text-slate-700">{loading ? 'Generating...' : 'Download as Image'}</span>
                                    </button>
                                    <button
                                        onClick={generateWorkScheduleText}
                                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg transition-all text-left"
                                    >
                                        <ClipboardList className="text-sky-600" size={18} />
                                        <span className="text-sm font-medium text-slate-700">Copy as Text</span>
                                    </button>
                                </div>
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
                                    <div className="relative">
                                        <select
                                            value={selectedQA}
                                            onChange={(e) => setSelectedQA(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm appearance-none bg-white"
                                        >
                                            <option value="">Choose a Member...</option>
                                            {teamMembers.map((member) => (
                                                <option key={member.id} value={member.name}>
                                                    {member.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>


                                {/* Date Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Select Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedQADate}
                                        onChange={(e) => setSelectedQADate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2">
                                    <button
                                        onClick={generateQAWorkStatusImage}
                                        disabled={loading || !selectedQA}
                                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Camera className="text-sky-600" size={18} />
                                        <span className="text-sm font-medium text-slate-700">Download as Image</span>
                                    </button>
                                    <button
                                        onClick={generateQAWorkStatusText}
                                        disabled={loading || !selectedQA}
                                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ClipboardList className="text-sky-600" size={18} />
                                        <span className="text-sm font-medium text-slate-700">Copy as Text</span>
                                    </button>
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

            </div>
        </div >
    );
}
