'use client';

import ProjectStatusPage from '@/components/ProjectStatusPage';

export default function RejectedProjects() {
    return (
        <ProjectStatusPage
            pageTitle="Rejected Projects"
            statusFilter="Rejected"
        />
    );
}
