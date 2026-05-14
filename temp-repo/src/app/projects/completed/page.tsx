'use client';

import ProjectStatusPage from '@/components/ProjectStatusPage';

export default function CompletedProjects() {
    return (
        <ProjectStatusPage
            pageTitle="Completed Projects"
            statusFilter="Completed"
        />
    );
}
