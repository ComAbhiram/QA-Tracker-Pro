import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Using service role key to bypass RLS for API operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch all sub-phases for a team
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('team_id');

        if (!teamId) {
            return NextResponse.json(
                { error: 'team_id is required' },
                { status: 400 }
            );
        }

        let query = supabase
            .from('team_subphases')
            .select('*');

        // QA Team ID: ba60298b-8635-4cca-bcd5-7e470fad60e6
        // If it's NOT the QA Team (Global), filter by team_id
        if (teamId !== 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
            query = query.eq('team_id', teamId);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) {
            console.error('Error fetching sub-phases:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ subphases: data });
    } catch (error: any) {
        console.error('Unexpected error in GET /api/subphases:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create a new sub-phase
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { team_id, name } = body;

        if (!team_id || !name) {
            return NextResponse.json(
                { error: 'team_id and name are required' },
                { status: 400 }
            );
        }

        // Check if sub-phase already exists for this team
        const { data: existing } = await supabase
            .from('team_subphases')
            .select('id')
            .eq('team_id', team_id)
            .eq('name', name)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Sub-phase already exists for this team' },
                { status: 409 }
            );
        }

        const { data, error } = await supabase
            .from('team_subphases')
            .insert([{ team_id, name }])
            .select()
            .single();

        if (error) {
            console.error('Error creating sub-phase:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Sub-phase created successfully',
            subphase: data
        });
    } catch (error: any) {
        console.error('Unexpected error in POST /api/subphases:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a sub-phase
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('team_subphases')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting sub-phase:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Sub-phase deleted successfully'
        });
    } catch (error: any) {
        console.error('Unexpected error in DELETE /api/subphases:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
