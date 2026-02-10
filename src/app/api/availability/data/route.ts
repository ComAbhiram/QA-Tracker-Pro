
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('team_id');
        const startDate = searchParams.get('start_date'); // Optional optimization

        if (!teamId) {
            return NextResponse.json({ error: 'Missing team_id' }, { status: 400 });
        }

        if (!supabaseServiceKey) {
            console.error('SERVER ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined.');
            return NextResponse.json({ error: 'Server misconfiguration: Missing Service Role Key' }, { status: 500 });
        }

        // 1. Verify Authentication
        const supabase = createServerClient(
            supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Use Service Key to fetch data (Bypass RLS)
        // We need this because we might be checking a different team than our own
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch Tasks (Active only)
        const tasksPromise = supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('team_id', teamId)
            .not('status', 'in', '("Completed","Rejected")');

        // Fetch Leaves (Active only)
        const leavesPromise = supabaseAdmin
            .from('leaves')
            .select('*')
            .eq('team_id', teamId)
            .neq('status', 'Rejected');

        const [tasksRes, leavesRes] = await Promise.all([tasksPromise, leavesPromise]);

        if (tasksRes.error) {
            console.error('Error fetching tasks for availability:', tasksRes.error);
            throw tasksRes.error;
        }

        if (leavesRes.error) {
            console.error('Error fetching leaves for availability:', leavesRes.error);
            throw leavesRes.error;
        }

        return NextResponse.json({
            tasks: tasksRes.data || [],
            leaves: leavesRes.data || []
        });

    } catch (error: any) {
        console.error('Check Availability API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
