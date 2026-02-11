import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/pcs
 * Fetch all global PCs
 */
export async function GET(request: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('global_pcs')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching PCs:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ pcs: data });
    } catch (error: any) {
        console.error('Unexpected error in GET /api/pcs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/pcs
 * Create a new PC
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'name is required' },
                { status: 400 }
            );
        }

        // Check if PC already exists
        const { data: existing } = await supabase
            .from('global_pcs')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'PC name already exists' },
                { status: 409 }
            );
        }

        // Insert new PC
        const { data, error } = await supabase
            .from('global_pcs')
            .insert([{ name }])
            .select()
            .single();

        if (error) {
            console.error('Error creating PC:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'PC created successfully',
            pc: data
        });
    } catch (error: any) {
        console.error('Unexpected error in POST /api/pcs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/pcs?id=X
 * Delete a PC by ID
 */
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
            .from('global_pcs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting PC:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'PC deleted successfully'
        });
    } catch (error: any) {
        console.error('Unexpected error in DELETE /api/pcs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
