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
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #ffffff;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            padding: 48px 24px;
            background-color: #ffffff;
        }
        .container {
            max-width: 560px;
            margin: 0 auto;
        }
        .logo {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #666666;
            margin-bottom: 48px;
        }
        .title {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #000000;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 15px;
            color: #666666;
            margin-bottom: 40px;
        }
        .change-card {
            background-color: #f9f9f9;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 40px;
        }
        .change-label {
            font-size: 11px;
            font-weight: 700;
            color: #999999;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 16px;
        }
        .change-comparison {
            display: flex;
            align-items: center;
        }
        .date-block {
            flex: 1;
        }
        .date-label {
            font-size: 12px;
            color: #666666;
            margin-bottom: 4px;
        }
        .date-value {
            font-size: 18px;
            font-weight: 600;
        }
        .date-value.old {
            color: #999999;
            text-decoration: line-through;
        }
        .date-value.new {
            color: #000000;
        }
        .separator {
            padding: 0 20px;
            color: #999999;
            font-size: 20px;
        }
        .details-grid {
            border-top: 1px solid #eeeeee;
            padding-top: 32px;
            margin-bottom: 40px;
        }
        .detail-item {
            display: flex;
            margin-bottom: 16px;
        }
        .detail-key {
            width: 120px;
            font-size: 13px;
            color: #999999;
        }
        .detail-val {
            flex: 1;
            font-size: 13px;
            color: #1a1a1a;
            font-weight: 500;
        }
        .button-container {
            margin-top: 48px;
        }
        .button {
            display: inline-block;
            background-color: #000000;
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: opacity 0.2s;
        }
        .footer {
            margin-top: 64px;
            padding-top: 32px;
            border-top: 1px solid #f0f0f0;
        }
        .footer-text {
            font-size: 12px;
            color: #999999;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="logo">Intersmart Team Tracker</div>
            <div class="title">Task Date Updated</div>
            <div class="subtitle">A change was made to a task in the <strong>${teamName}</strong>.</div>

            <div class="change-card">
                <div class="change-label">${dateFieldLabel} Changed</div>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="42%" valign="top">
                            <div class="date-label">From</div>
                            <div class="date-value old">${oldDateFormatted}</div>
                        </td>
                        <td width="16%" align="center" valign="middle">
                            <div class="separator">→</div>
                        </td>
                        <td width="42%" valign="top">
                            <div class="date-label">To</div>
                            <div class="date-value new">${newDateFormatted}</div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-key">Project</div>
                    <div class="detail-val">${projectName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-key">Task</div>
                    <div class="detail-val">${taskName || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-key">Assignee</div>
                    <div class="detail-val">${assignee}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-key">Status</div>
                    <div class="detail-val">${status}</div>
                </div>
                ${priority ? `
                <div class="detail-item">
                    <div class="detail-key">Priority</div>
                    <div class="detail-val">${priority}</div>
                </div>
                ` : ''}
                <div class="detail-item">
                    <div class="detail-key">Task ID</div>
                    <div class="detail-val">#${taskId}</div>
                </div>
            </div>

            <div class="button-container">
                <a href="${taskLink}" class="button">View Task</a>
            </div>

            <div class="footer">
                <div class="footer-text">
                    Intersmart Team Tracker automated notification.<br/>
                    Professional project tracking for efficient teams.
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
