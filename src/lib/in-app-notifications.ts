import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Standalone Supabase admin client – safe to import anywhere (no nodemailer dependency)
const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceRoleKey || '', {
    auth: { autoRefreshToken: false, persistSession: false }
});

export interface InAppNotificationParams {
    pcName: string;
    taskId?: number | null;
    projectName: string;
    taskName?: string;
    action: 'created' | 'updated' | 'assigned';
    changes?: Record<string, { old: any; new: any }>;
}

export async function createInAppNotification(params: InAppNotificationParams): Promise<void> {
    try {
        const { pcName, taskId, projectName, taskName, action, changes } = params;
        const { error } = await supabaseAdmin.from('pc_notifications').insert({
            pc_name: pcName,
            task_id: taskId || null,
            project_name: projectName,
            task_name: taskName || null,
            action,
            changes: changes || null,
            is_read: false,
        });
        if (error) {
            console.error('[InApp Notification] Supabase insert error:', error.message);
        } else {
            console.log(`[InApp Notification] ✅ Saved for PC: ${pcName}`);
        }
    } catch (err) {
        console.error('[InApp Notification] Unexpected error:', err);
    }
}
