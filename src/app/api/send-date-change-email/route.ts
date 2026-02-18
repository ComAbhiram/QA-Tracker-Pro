import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// TEMPORARY: Only sending to Resend account email for testing
// Once domain is verified, change back to all 4 recipients
const RECIPIENTS = [
    'abhiram@intersmart.in'  // Resend account email - testing only
    // 'steve@intersmart.in',
    // 'saneesh@intersmart.in',
    // 'sunil@intersmart.in',
];

interface DateChangeEmailRequest {
    taskId: number;
    taskName: string;
    projectName: string;
    assignee: string;
    teamName: string;
    dateField: 'start_date' | 'end_date';
    oldDate: string | null;
    newDate: string | null;
    status: string;
    priority?: string;
    phase?: string;
    pc?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: DateChangeEmailRequest = await request.json();
        const {
            taskId,
            taskName,
            projectName,
            assignee,
            teamName,
            dateField,
            oldDate,
            newDate,
            status,
            priority,
            phase,
            pc
        } = body;

        const dateFieldLabel = dateField === 'start_date' ? 'Start Date' : 'End Date';
        const oldDateFormatted = oldDate ? new Date(oldDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';
        const newDateFormatted = newDate ? new Date(newDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

        // Task tracker link
        const taskLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://qa-tracker-pro.vercel.app'}/tracker`;

        // Create HTML email
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding: 40px 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
            padding: 32px;
            border-bottom: 1px solid #f1f5f9;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #4f46e5;
            letter-spacing: -0.025em;
        }
        .header p {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #64748b;
        }
        .content {
            padding: 32px;
        }
        .change-section {
            background-color: #fdf2f2;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #fee2e2;
        }
        .change-title {
            font-size: 12px;
            font-weight: 700;
            color: #b91c1c;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
        }
        .change-grid {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .change-item {
            flex: 1;
        }
        .change-label {
            font-size: 11px;
            color: #991b1b;
            margin-bottom: 4px;
        }
        .change-value {
            font-size: 16px;
            font-weight: 600;
        }
        .change-value.old {
            color: #991b1b;
            text-decoration: line-through;
            opacity: 0.7;
        }
        .change-value.new {
            color: #15803d;
        }
        .arrow {
            color: #ef4444;
            font-size: 18px;
        }
        .details-section h2 {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin: 0 0 16px 0;
        }
        .detail-row {
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-size: 13px;
            color: #64748b;
            font-weight: 500;
        }
        .detail-value {
            font-size: 13px;
            color: #1e293b;
            font-weight: 600;
            text-align: right;
        }
        .footer {
            padding: 32px;
            background-color: #f8fafc;
            text-align: center;
            border-top: 1px solid #f1f5f9;
        }
        .button {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            margin-top: 8px;
        }
        .footer-text {
            margin-top: 24px;
            font-size: 11px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Task Date Updated</h1>
                <p>Team ${teamName}</p>
            </div>
            <div class="content">
                <div class="change-section">
                    <div class="change-title">${dateFieldLabel} Change</div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td width="42%" valign="top">
                                <div class="change-label">Previous</div>
                                <div class="change-value old">${oldDateFormatted}</div>
                            </td>
                            <td width="16%" align="center" valign="middle">
                                <div class="arrow">→</div>
                            </td>
                            <td width="42%" valign="top">
                                <div class="change-label">New Date</div>
                                <div class="change-value new">${newDateFormatted}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="details-section">
                    <h2>Task Details</h2>
                    <div class="detail-row">
                        <span class="detail-label">Project</span>
                        <span class="detail-value">${projectName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Task</span>
                        <span class="detail-value">${taskName || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Assignee</span>
                        <span class="detail-value">${assignee}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">${status}</span>
                    </div>
                    ${priority ? `
                    <div class="detail-row">
                        <span class="detail-label">Priority</span>
                        <span class="detail-value">${priority}</span>
                    </div>
                    ` : ''}
                    ${phase ? `
                    <div class="detail-row">
                        <span class="detail-label">Phase</span>
                        <span class="detail-value">${phase}</span>
                    </div>
                    ` : ''}
                    ${pc ? `
                    <div class="detail-row">
                        <span class="detail-label">PC</span>
                        <span class="detail-value">${pc}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">ID</span>
                        <span class="detail-value">#${taskId}</span>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 32px;">
                    <a href="${taskLink}" class="button">View Task in Tracker</a>
                </div>
            </div>
            <div class="footer">
                <div class="footer-text">
                    This is an automated notification from Intersmart Team Tracker.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        // Check if Resend is configured
        if (!resend) {
            console.warn('[Email API] Resend API key not configured - skipping email');
            return NextResponse.json({
                error: 'Email service not configured',
                message: 'RESEND_API_KEY environment variable is not set'
            }, { status: 503 });
        }

        // Send email to all recipients
        const { data, error } = await resend.emails.send({
            from: 'Intersmart Team Tracker <onboarding@resend.dev>',
            to: RECIPIENTS,
            subject: `Task ${dateFieldLabel} Changed - ${teamName}`,
            html: htmlContent,
        });

        if (error) {
            console.error('[Email API] Error sending email:', error);
            return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 });
        }

        console.log('[Email API] Email sent successfully:', data);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('[Email API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
