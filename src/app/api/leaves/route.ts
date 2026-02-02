import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: Fetch all leaves filtered by user's team
export async function GET(request: Request) {
    try {
        // Get the current user's team_id
        const { data: { user } } = await supabaseServer.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's team_id from user_profiles
        const { data: profile } = await supabaseServer
            .from('user_profiles')
            .select('team_id')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.team_id) {
            return NextResponse.json(
                { error: 'User not associated with a team' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        let query = supabase
            .from('leaves')
            .select('*')
            .eq('team_id', profile.team_id) // Filter by team
            .order('leave_date', { ascending: true });

        // Filter by date range if provided
        if (startDate) {
            query = query.gte('leave_date', startDate);
        }
        if (endDate) {
            query = query.lte('leave_date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching leaves:', error);
            return NextResponse.json(
                { error: 'Failed to fetch leaves' },
                { status: 500 }
            );
        }

        return NextResponse.json({ leaves: data || [] });

    } catch (error: any) {
        console.error('Error in /api/leaves GET:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch leaves' },
            { status: 500 }
        );
    }
}

// POST: Create a new leave request
export async function POST(request: Request) {
    try {
        // Get the current user's team_id
        const { data: { user } } = await supabaseServer.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's team_id from user_profiles
        const { data: profile } = await supabaseServer
            .from('user_profiles')
            .select('team_id')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.team_id) {
            return NextResponse.json(
                { error: 'User not associated with a team' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();

        const {
            team_member_id,
            team_member_name,
            leave_date,
            leave_type,
            reason,
            created_by
        } = body;

        // Validate required fields
        if (!team_member_id || !team_member_name || !leave_date || !leave_type) {
            return NextResponse.json(
                { error: 'Missing required fields: team_member_id, team_member_name, leave_date, leave_type' },
                { status: 400 }
            );
        }

        // Insert the leave request with team_id
        const { data, error } = await supabase
            .from('leaves')
            .insert([
                {
                    team_member_id,
                    team_member_name,
                    leave_date,
                    leave_type,
                    reason: reason || null,
                    created_by: created_by || null,
                    team_id: profile.team_id // Add team_id
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating leave:', error);
            return NextResponse.json(
                { error: 'Failed to create leave request' },
                { status: 500 }
            );
        }

        return NextResponse.json({ leave: data }, { status: 201 });

    } catch (error: any) {
        console.error('Error in /api/leaves POST:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create leave request' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a leave request
export async function DELETE(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);
        const leaveId = searchParams.get('id');

        if (!leaveId) {
            return NextResponse.json(
                { error: 'Missing leave ID' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('leaves')
            .delete()
            .eq('id', leaveId);

        if (error) {
            console.error('Error deleting leave:', error);
            return NextResponse.json(
                { error: 'Failed to delete leave request' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error in /api/leaves DELETE:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete leave request' },
            { status: 500 }
        );
    }
}
