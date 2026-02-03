import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET: Fetch all project overviews for the user's team
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's team
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('team_id')
            .eq('id', user.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json({ error: 'User team not found' }, { status: 404 });
        }

        // Fetch project overviews with stats
        const { data: projects, error } = await supabase
            .from('project_overview_with_stats')
            .select('*')
            .eq('team_id', profile.team_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching project overviews:', error);
            return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
        }

        return NextResponse.json({ projects: projects || [] });
    } catch (error) {
        console.error('Error in GET /api/project-overview:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new project overview
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's team
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('team_id')
            .eq('id', user.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json({ error: 'User team not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            project_name,
            location,
            pc,
            allotted_time_days,
            tl_confirmed_effort_days,
            blockers
        } = body;

        if (!project_name) {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        // Insert new project overview
        const { data: newProject, error } = await supabase
            .from('project_overview')
            .insert({
                project_name,
                team_id: profile.team_id,
                location: location || null,
                pc: pc || null,
                allotted_time_days: allotted_time_days || null,
                tl_confirmed_effort_days: tl_confirmed_effort_days || null,
                blockers: blockers || null,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating project overview:', error);
            return NextResponse.json(
                { error: 'Failed to create project', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ project: newProject }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/project-overview:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT: Update an existing project overview
export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            id,
            location,
            pc,
            allotted_time_days,
            tl_confirmed_effort_days,
            blockers
        } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Update project overview
        const { data: updatedProject, error } = await supabase
            .from('project_overview')
            .update({
                location,
                pc,
                allotted_time_days,
                tl_confirmed_effort_days,
                blockers
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating project overview:', error);
            return NextResponse.json(
                { error: 'Failed to update project', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ project: updatedProject });
    } catch (error) {
        console.error('Error in PUT /api/project-overview:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a project overview
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Delete project overview
        const { error } = await supabase
            .from('project_overview')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project overview:', error);
            return NextResponse.json(
                { error: 'Failed to delete project', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/project-overview:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
