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
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .change-box { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #EF4444; border-radius: 4px; }
        .task-details { background-color: #fff; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; width: 150px; color: #6b7280; }
        .detail-value { flex: 1; color: #111827; }
        .button { display: inline-block; background-color: #4F46E5; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; font-size: 16px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">Task Date Changed</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Team: ${teamName}</p>
        </div>
        <div class="content">
            <div class="change-box">
                <h3 style="margin-top: 0; color: #EF4444;">${dateFieldLabel} Changed</h3>
                <p style="margin: 10px 0;">
                    <strong>From:</strong> <span style="color: #EF4444; text-decoration: line-through;">${oldDateFormatted}</span><br/>
                    <strong>To:</strong> <span style="color: #10B981; font-weight: bold;">${newDateFormatted}</span>
                </p>
            </div>

            <div class="task-details">
                <h3 style="margin-top: 0; color: #4F46E5;">Task Details</h3>
                <div class="detail-row">
                    <div class="detail-label">Project:</div>
                    <div class="detail-value">${projectName}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Task:</div>
                    <div class="detail-value">${taskName || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Assignee:</div>
                    <div class="detail-value">${assignee}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">${status}</div>
                </div>
                ${priority ? `
                <div class="detail-row">
                    <div class="detail-label">Priority:</div>
                    <div class="detail-value">${priority}</div>
                </div>
                ` : ''}
                ${phase ? `
                <div class="detail-row">
                    <div class="detail-label">Phase:</div>
                    <div class="detail-value">${phase}</div>
                </div>
                ` : ''}
                ${pc ? `
                <div class="detail-row">
                    <div class="detail-label">PC:</div>
                    <div class="detail-value">${pc}</div>
                </div>
                ` : ''}
                <div class="detail-row" style="border-bottom: none;">
                    <div class="detail-label">Task ID:</div>
                    <div class="detail-value">#${taskId}</div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${taskLink}" class="button">View Task in Tracker</a>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated notification from Intersmart Team Tracker</p>
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
