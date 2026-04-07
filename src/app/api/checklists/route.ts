import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_CHECKLISTS = [
    'Payment Gateway Access Received',
    'Location Details Confirmed',
    'Hosting / Server Access Received',
    'Domain Access Available',
    'SMTP / Brevo Config Ready',
    'Google Maps API Key Added',
    'WhatsApp Number Integrated',
    'Shipping API Credentials Received',
    'CDN Configured',
    'Third-party Integrations Confirmed',
];

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('checklists')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Auto-seed default checklists if none exist
        if (!data || data.length === 0) {
            const inserts = DEFAULT_CHECKLISTS.map(title => ({ title, created_by: 'system' }));
            const { data: seeded, error: seedError } = await supabase
                .from('checklists')
                .insert(inserts)
                .select();
            if (seedError) throw seedError;
            return NextResponse.json({ checklists: seeded });
        }

        return NextResponse.json({ checklists: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { title } = await request.json();
        if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('checklists')
            .insert([{ title: title.trim(), created_by: 'admin' }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ checklist: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
