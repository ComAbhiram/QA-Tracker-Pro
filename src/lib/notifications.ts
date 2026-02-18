import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const CC_RECIPIENTS = [
    { address: 'abhiram@intersmart.in', name: 'Abhiram' },
    { address: 'saneesh@intersmart.in', name: 'Saneesh' },
    { address: 'steve@intersmart.in', name: 'Steve' },
    { address: 'sunil@intersmart.in', name: 'Sunil' }
];

interface PCNotificationParams {
    type: 'created' | 'updated';
    pcEmail: string;
    pcName: string;
    projectName: string;
    taskName: string;
    assignee: string;
    status: string;
    priority?: string;
    startDate?: string | null;
    endDate?: string | null;
    changes?: Record<string, { old: any, new: any }>;
}

export async function sendPCNotification(params: PCNotificationParams) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    console.log(`[Notification Service] Triggered for ${params.pcName} (${params.pcEmail})`);

    if (!smtpUser || !smtpPass) {
        console.error('[Notification Service] SMTP credentials missing in process.env (SMTP_USER/SMTP_PASS)');
        return { success: false, error: 'SMTP credentials missing' };
    }

    const {
        type,
        pcEmail,
        pcName,
        projectName,
        taskName,
        assignee,
        status,
        priority,
        startDate,
        endDate,
        changes
    } = params;

    const subject = `${type === 'created' ? 'New Task' : 'Task Updated'}: ${projectName} - ${taskName}`;

    let htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Intersmart Team Tracker Notification</h2>
            <p>Hello <strong>${pcName}</strong>,</p>
            <p>A task you are coordinating has been <strong>${type === 'created' ? 'created' : 'updated'}</strong>.</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%;">
                    <tr><td style="font-weight: bold; width: 120px;">Project:</td><td>${projectName}</td></tr>
                    <tr><td style="font-weight: bold;">Task/Phase:</td><td>${taskName}</td></tr>
                    <tr><td style="font-weight: bold;">Assignee:</td><td>${assignee}</td></tr>
                    <tr><td style="font-weight: bold;">Status:</td><td>${status}</td></tr>
                    ${priority ? `<tr><td style="font-weight: bold;">Priority:</td><td>${priority}</td></tr>` : ''}
                    <tr><td style="font-weight: bold;">Start Date:</td><td>${startDate || 'Not set'}</td></tr>
                    <tr><td style="font-weight: bold;">End Date:</td><td>${endDate || 'Not set'}</td></tr>
                </table>
            </div>
    `;

    if (type === 'updated' && changes && Object.keys(changes).length > 0) {
        htmlContent += `
            <h3 style="color: #374151;">Changes made:</h3>
            <ul style="list-style: none; padding: 0;">
        `;
        for (const [field, change] of Object.entries(changes)) {
            htmlContent += `
                <li style="margin-bottom: 10px; padding: 10px; background: #fffbeb; border-radius: 6px; border: 1px solid #fef3c7;">
                    <strong style="text-transform: capitalize;">${field.replace(/_/g, ' ')}:</strong> 
                    <span style="color: #991b1b; text-decoration: line-through;">${change.old || 'None'}</span> 
                    <span style="color: #166534;">→ ${change.new || 'None'}</span>
                </li>
            `;
        }
        htmlContent += `</ul>`;
    }

    htmlContent += `
            <p style="margin-top: 30px;">
                <a href="https://qa-tracker-pro.vercel.app/tracker" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Tracker</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">Intersmart Team Tracker Automated System</p>
        </div>
    `;

    try {
        console.log(`[Notification Service] Attempting to send SMTP email to ${pcEmail} using ${smtpUser}...`);
        // Create SMTP transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        // Send mail
        const info = await transporter.sendMail({
            from: `"Intersmart Team Tracker" <${smtpUser}>`,
            to: `"${pcName}" <${pcEmail}>`,
            cc: CC_RECIPIENTS.map(cc => `"${cc.name}" <${cc.address}>`).join(', '),
            subject: subject,
            html: htmlContent
        });

        console.log('[Notification Service] ✅ Email sent successfully via SMTP:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('[Notification Service] SMTP Error detailed:', error);
        return { success: false, error: 'SMTP send failed' };
    }
}
