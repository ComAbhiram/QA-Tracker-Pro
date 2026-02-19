'use client';

import ProjectStatusPage from '@/components/ProjectStatusPage';

export default function OnHoldProjects() {
    return (
        <ProjectStatusPage
            pageTitle="On Hold Projects"
            statusFilter="On Hold"
        />
    );
}
