const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'notifications@intersmart.in';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const CC_RECIPIENTS = [
    { email: 'abhiram@intersmart.in', name: 'Abhiram' },
    { email: 'saneesh@intersmart.in', name: 'Saneesh' },
    { email: 'steve@intersmart.in', name: 'Steve' },
    { email: 'sunil@intersmart.in', name: 'Sunil' }
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
    if (!BREVO_API_KEY) {
        console.error('[Notification Service] Brevo API Key missing');
        return { success: false, error: 'API Key missing' };
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
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Intersmart Team Tracker', email: BREVO_SENDER_EMAIL },
                to: [{ email: pcEmail, name: pcName }],
                cc: CC_RECIPIENTS,
                subject: subject,
                htmlContent: htmlContent
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Notification Service] Brevo Error:', errorData);
            return { success: false, error: 'Brevo request failed' };
        }

        return { success: true };
    } catch (error) {
        console.error('[Notification Service] Unexpected Error:', error);
        return { success: false, error: 'Internal fetch error' };
    }
}
