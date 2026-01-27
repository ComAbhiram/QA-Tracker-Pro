import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('qa_members')
            .select('*')
            .order('name');

        if (error) throw error;

        return NextResponse.json({ members: data });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch QA members' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { members } = body;

        if (!Array.isArray(members)) {
            return NextResponse.json(
                { error: 'Members must be an array' },
                { status: 400 }
            );
        }

        // Transaction-like approach: Clear current members and insert new ones
        // Note: Supabase implementation of transactions via client is not direct, 
        // so we'll delete all valid records first.
        // In a production env, you'd want a proper transaction or upsert logic.

        // 1. Delete all existing (simple replacement strategy)
        const { error: deleteError } = await supabase
            .from('qa_members')
            .delete()
            .neq('id', 0); // Delete all rows

        if (deleteError) throw deleteError;

        if (members.length > 0) {
            // 2. Insert new selections
            const { error: insertError } = await supabase
                .from('qa_members')
                .insert(members.map((m: any) => ({
                    name: m.name,
                    hubstaff_name: m.hubstaffName, // Map UI/Hubstaff prop to DB column
                    hubstaff_user_id: m.id, // Ensure we store the ID
                    department: 'QA'
                })));

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving QA members:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save QA members' },
            { status: 500 }
        );
    }
}
