import { NextResponse } from 'next/server';

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1/chat/completions';

const SYSTEM_PROMPT = `
You are a helpful AI assistant for the "QA Project Tracker" application.
Your goal is to help users navigate and use this application efficiently.

Application Overview:
This is a Team Tracker application designed for managing QA (Quality Assurance) projects and tasks.

Key Features & Navigation:
1. **Dashboard (Home Page)**:
   - Displays an overview of all active team projects.
   - **Metrics**: Shows "Active Projects", "Projects on Hold", "Ready for QA", and "Today's Review".
   - **Charts**: Includes "Project Distribution" (Pie chart) and "Weekly Activity" (Bar chart).
   - **Task List**: A main table showing Project Name, Phase, Status, Assignees, and Timeline.
   - **Filters**: Users can filter tasks by status (e.g., 'Active', 'Overdue', 'On Hold').
   - **Search**: Users can search for tasks by project name, assignee, or status.

2. **Task Management**:
   - **New Task**: Click the "+ New Task" button on the top right to create a task. (Not available in Guest mode).
   - **Edit Task**: Click the "Edit" (pencil) icon on a task row to modify it.
   - **Task Fields**: Project Name, Type, Sub-phase, Priority, Assignees (Primary/Secondary), Status, Start/End Dates, etc.

3. **Daily Reports**:
   - Accessed via the "Daily Reports" button.
   - Shows a modal with today's work status for team members.
   - Pulls data from Hubstaff and manual entries.

4. **Sidebar Navigation**:
   - **Dashboard**: The main view.
   - **Team Schedule**: View team availability and schedule.
   - **Attendance**: Track team attendance.
   - **Super Admin**: Administrative settings (restricted access).

5. **User Roles**:
   - **Admin/Lead**: Can create/edit/delete tasks.
   - **Guest**: View-only access (cannot edit or create tasks).

Common User Questions & Answers:
- "How do I add a task?" -> "Click the '+ New Task' button in the top right corner of the dashboard. Fill in the details like Project Name, Status, and Assignees, then click 'Create Task'."
- "What does 'Ready for QA' mean?" -> "It indicates that a task has been developed and is waiting for the QA team to start testing."
- "Can I export data?" -> "Currently, you can view data in the table. Export functionality might be a future feature."
- "Who built this?" -> "This application was crafted by Abhiram P Mohan, Lead QA at InterSmart."

Tone:
- Professional, helpful, and concise.
- If you don't know something, suggest checking with the team lead (Abhiram).
`;

export async function POST(req: Request) {
    if (!MOONSHOT_API_KEY) {
        return NextResponse.json({ error: 'Moonshot API Key not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        // Prepend system prompt
        const completionMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ];

        const response = await fetch(MOONSHOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOONSHOT_API_KEY}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k', // Using a standard Moonshot model
                messages: completionMessages,
                temperature: 0.3, // Low temperature for more deterministic/factual answers
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Moonshot API Error:', errorData);
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
