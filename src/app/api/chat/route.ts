import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_SYSTEM_PROMPT = `
You are a helpful AI assistant for the "QA Project Tracker" application.
Your goal is to help users navigate, use the app, and answer questions about specific projects based on the provided data.

Application Overview:
This is a Team Tracker application designed for managing QA (Quality Assurance) projects and tasks.

Key Features:
- **Dashboard**: Overview of active projects, metrics, and charts.
- **Task Management**: Create, edit, and track tasks.
- **Reports**: Daily work status and Hubstaff activity.
- **User Roles**: Admin/Lead (Editors) vs Guest (View-only).

Data Interpretation Rules:
1. **Current Date**: Always use the "Current Date" provided in the context to answer time-relative questions (e.g., "overdue today", "scheduled for next week").
2. **Status Meanings**:
   - "Ready for QA": Dev done, waiting for QA.
   - "In Progress": Currently being worked on.
   - "Forecasting": Planned for future.
3. **Performance Queries**:
   - If asked about "best performer", look at the "Completed Tasks" list and count who has the most completions or handled the most complex tasks (if priority/complexity is visible).
   - If data is insufficient, say "Based on the recent data available to me...".
4. **Specific Projects**:
   - If asked about a project, look it up in the "Active Tasks" list.
   - If not found, check "Completed" or say "I don't see that project in the active list."

Tone:
- Professional, concise, and data-driven.
`;

async function getEnhancedSystemPrompt() {
    const today = new Date().toDateString();
    let dataContext = `\n\n=== LIVE DATA CONTEXT (Current Date: ${today}) ===\n`;

    try {
        // 1. Fetch Active Tasks
        const { data: activeTasks, error: activeError } = await supabase
            .from('tasks')
            .select('project_name, status, start_date, end_date, assigned_to, assigned_to2, sub_phase')
            .not('status', 'in', '("Completed","Rejected")')
            .order('end_date', { ascending: true })
            .limit(100);

        if (activeError) throw activeError;

        dataContext += `\n[Active Tasks] (Top 100 by due date):\n`;
        if (activeTasks && activeTasks.length > 0) {
            activeTasks.forEach(t => {
                const assignees = [t.assigned_to, t.assigned_to2].filter(Boolean).join(', ');
                dataContext += `- **${t.project_name}**: Status=${t.status}, Phase=${t.sub_phase || 'N/A'}, Assigned=[${assignees}], Due=${t.end_date || 'N/A'}\n`;
            });
        } else {
            dataContext += "No active tasks found.\n";
        }

        // 2. Fetch Recently Completed (Last 50) for Performance Context
        const { data: completedTasks, error: completedError } = await supabase
            .from('tasks')
            .select('project_name, assigned_to, actual_completion_date')
            .eq('status', 'Completed')
            .order('actual_completion_date', { ascending: false })
            .limit(50);

        if (completedError) throw completedError;

        dataContext += `\n[Recently Completed Tasks] (Last 50):\n`;
        if (completedTasks && completedTasks.length > 0) {
            completedTasks.forEach(t => {
                dataContext += `- **${t.project_name}**: Completed by ${t.assigned_to} on ${t.actual_completion_date}\n`;
            });
        }

    } catch (err) {
        console.error('Error fetching chat context data:', err);
        dataContext += "\n[Error fetching live data. Please apologize to the user and answer based on general knowledge only.]\n";
    }

    return BASE_SYSTEM_PROMPT + dataContext;
}

export async function POST(req: Request) {
    if (!GROQ_API_KEY) {
        return NextResponse.json({ error: 'Groq API Key not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        // Generate System Prompt with Live Data
        const systemPromptWithData = await getEnhancedSystemPrompt();

        // Prepend system prompt
        const completionMessages = [
            { role: 'system', content: systemPromptWithData },
            ...messages
        ];

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: completionMessages,
                temperature: 0.3,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Groq AI Error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch response from AI provider' }, { status: response.status });
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message;

        return NextResponse.json({ message: aiMessage });

    } catch (error) {
        console.error('Error in chat route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
