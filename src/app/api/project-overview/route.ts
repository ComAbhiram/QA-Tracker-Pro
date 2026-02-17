import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: Fetch all project overviews with aggregated task stats
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

        // Get user's team and role
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('team_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json({ error: 'User team not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const requestedTeamId = searchParams.get('teamId');

        const isGuestMode = cookieStore.get('guest_mode')?.value === 'true';

        // 1. Fetch Projects and their metadata from 'projects' table
        let projectsQuery = supabase
            .from('projects')
            .select('*');

        if (profile.role !== 'super_admin' && !isGuestMode) {
            projectsQuery = projectsQuery.eq('team_id', profile.team_id);
        } else if (requestedTeamId) {
            projectsQuery = projectsQuery.eq('team_id', requestedTeamId);
        }

        const { data: projects, error: projectsError } = await projectsQuery.order('created_at', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
        }

        // 2. Fetch All Tasks for Aggregation AND Grid View
        let tasksQuery = supabase
            .from('tasks')
            .select('*');

        if (profile.role !== 'super_admin' && !isGuestMode) {
            tasksQuery = tasksQuery.eq('team_id', profile.team_id);
        } else if (requestedTeamId) {
            tasksQuery = tasksQuery.eq('team_id', requestedTeamId);
        }

        const { data: tasks, error: tasksError } = await tasksQuery;

        if (tasksError) {
            console.error('Error fetching tasks for stats:', tasksError);
        }

        // 3. Aggregate Stats by Project Name
        const projectStats: Record<string, any> = {};

        (tasks || []).forEach((task: any) => {
            const pName = task.project_name;
            if (!pName) return;

            if (!projectStats[pName]) {
                projectStats[pName] = {
                    resources: new Set<string>(),
                    totalActivityPercentage: 0,
                    totalTimeTakenSeconds: 0,
                    totalAllottedDays: 0,
                    taskCount: 0
                };
            }

            const stats = projectStats[pName];
            stats.taskCount++;

            if (task.assigned_to) stats.resources.add(task.assigned_to);
            if (task.assigned_to2) stats.resources.add(task.assigned_to2);
            if (Array.isArray(task.additional_assignees)) {
                task.additional_assignees.forEach((a: string) => stats.resources.add(a));
            }

            stats.totalActivityPercentage += (Number(task.activity_percentage) || 0);
            stats.totalAllottedDays += (Number(task.days_allotted) || 0);

            if (task.time_taken) {
                const parts = task.time_taken.split(':').map(Number);
                if (parts.length === 3) {
                    stats.totalTimeTakenSeconds += (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                }
            }
        });

        // 4. Merge Stats into Projects
        const projectsWithStats = (projects || []).map((project: any) => {
            const stats = projectStats[project.name] || {
                resources: new Set(),
                totalActivityPercentage: 0,
                totalTimeTakenSeconds: 0,
                totalAllottedDays: 0,
                taskCount: 0
            };

            const timeTakenDays = stats.totalTimeTakenSeconds / (3600 * 8);
            const deviation = stats.totalAllottedDays - timeTakenDays;

            return {
                ...project,
                project_name: project.name, // Mapping 'name' to 'project_name' for frontend compatibility
                resources: Array.from(stats.resources).join(', '),
                activity_percentage: stats.totalActivityPercentage,
                hs_time_taken_days: timeTakenDays,
                allotted_time_days_calc: stats.totalAllottedDays,
                deviation_calc: deviation,
                task_count: stats.taskCount
            };
        });

        return NextResponse.json({
            projects: projectsWithStats || [],
            tasks: tasks || []
        });
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
            blockers,
            expected_effort_days,
            hubstaff_budget,
            committed_days,
            fixing_text,
            live_text,
            budget_text,
            started_date,
            project_type,
            category
        } = body;

        if (!project_name) {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        // Insert new project
        const { data: newProject, error } = await supabase
            .from('projects')
            .insert({
                name: project_name,
                team_id: profile.team_id,
                location: location || null,
                pc: pc || null,
                allotted_time_days: allotted_time_days || null,
                tl_confirmed_effort_days: tl_confirmed_effort_days || null,
                blockers: blockers || null,
                expected_effort_days: expected_effort_days || null,
                hubstaff_budget: hubstaff_budget || null,
                committed_days: committed_days || null,
                fixing_text: fixing_text || null,
                live_text: live_text || null,
                budget_text: budget_text || null,
                started_date: started_date || null,
                project_type: project_type || null,
                category: category || null,
                status: 'active'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
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
        const { id, ...updateFields } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Only include fields that are actually present in the request body
        // and filter out any fields that shouldn't be updated directly via this endpoint
        const allowedFields = [
            'name',
            'team_id', 'pc', 'allotted_time_days', 'tl_confirmed_effort_days',
            'blockers', 'expected_effort_days', 'hubstaff_budget', 'committed_days',
            'fixing_text', 'live_text', 'budget_text', 'started_date',
            'project_type', 'category'
        ];

        // Map 'project_name' to 'name' if provided
        if (updateFields.project_name) {
            updateFields.name = updateFields.project_name;
            delete updateFields.project_name;
        }

        const cleanUpdateData: Record<string, any> = {};
        Object.keys(updateFields).forEach(key => {
            if (allowedFields.includes(key)) {
                cleanUpdateData[key] = updateFields[key];
            }
        });

        if (Object.keys(cleanUpdateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        console.log(`[ProjectOverview] Updating project ${id} with:`, cleanUpdateData);

        const isGuestMode = cookieStore.get('guest_mode')?.value === 'true';
        const dbClient = isGuestMode ? supabaseAdmin : supabase;

        // Fetch current project to check for name change
        const { data: currentProject } = await dbClient
            .from('projects')
            .select('name, team_id')
            .eq('id', id)
            .single();

        // Update project
        const { data: updatedProject, error } = await dbClient
            .from('projects')
            .update(cleanUpdateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating project:', error);
            return NextResponse.json(
                { error: 'Failed to update project', details: error.message },
                { status: 500 }
            );
        }

        // Cascade update to tasks if project name changed
        if (currentProject && cleanUpdateData.name && currentProject.name !== cleanUpdateData.name) {
            console.log(`[ProjectOverview] Cascading name change from "${currentProject.name}" to "${cleanUpdateData.name}"`);

            const { error: taskUpdateError } = await supabase
                .from('tasks')
                .update({ project_name: cleanUpdateData.name })
                .eq('project_name', currentProject.name)
                .eq('team_id', currentProject.team_id);

            if (taskUpdateError) {
                console.error('Error cascading project name update to tasks:', taskUpdateError);
            }
        }

        return NextResponse.json({ project: updatedProject });
    } catch (error: any) {
        console.error('Error in PUT /api/project-overview:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
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

        const isGuestMode = cookieStore.get('guest_mode')?.value === 'true';
        const dbClient = isGuestMode ? supabaseAdmin : supabase;

        // Delete project
        const { error } = await dbClient
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
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
