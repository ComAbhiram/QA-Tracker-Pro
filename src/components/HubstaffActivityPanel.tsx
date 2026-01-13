'use client';

import { useState } from 'react';
import { HubstaffDailyActivity, formatDuration, getActivityColor } from '@/lib/hubstaff';
import { Clock, Activity, TrendingUp, RefreshCw, User } from 'lucide-react';

interface HubstaffActivityPanelProps {
    date: string;
    onSync: () => Promise<void>;
}

export default function HubstaffActivityPanel({ date, onSync }: HubstaffActivityPanelProps) {
    const [loading, setLoading] = useState(false);
    const [activityData, setActivityData] = useState<HubstaffDailyActivity | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSync = async () => {
        setLoading(true);
        setError(null);
        try {
            await onSync();
        } catch (err) {
            setError('Failed to sync Hubstaff data. Please check your API credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Hubstaff Activity</h2>
                    <p className="text-sm text-slate-500">Team time tracking and activity data</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Syncing...' : 'Sync Data'}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border-b border-red-100">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Setup Instructions */}
            <div className="p-6 bg-blue-50 border-b border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Setup Required</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Generate a Personal Access Token at <a href="https://developer.hubstaff.com/personal_access_tokens" target="_blank" rel="noopener noreferrer" className="underline">Hubstaff Developer Portal</a></li>
                    <li>Add <code className="bg-blue-100 px-1 rounded">HUBSTAFF_ACCESS_TOKEN</code> to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file</li>
                    <li>Add <code className="bg-blue-100 px-1 rounded">HUBSTAFF_ORG_ID=546910</code> to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file</li>
                    <li>Restart the development server</li>
                    <li>Click &quot;Sync Data&quot; to fetch activity</li>
                </ol>
            </div>

            {/* Activity Data */}
            {activityData && (
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Clock size={16} />
                                Total Time
                            </div>
                            <div className="text-2xl font-bold text-slate-800">
                                {formatDuration(activityData.totalTime)}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <User size={16} />
                                Team Members
                            </div>
                            <div className="text-2xl font-bold text-slate-800">
                                {activityData.activities.length}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <TrendingUp size={16} />
                                Avg Activity
                            </div>
                            <div className="text-2xl font-bold text-slate-800">
                                {activityData.activities.length > 0
                                    ? Math.round(
                                        activityData.activities.reduce((sum, a) => sum + a.activityPercentage, 0) /
                                        activityData.activities.length
                                    )
                                    : 0}
                                %
                            </div>
                        </div>
                    </div>

                    {/* Team Member Activities */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-slate-800">Team Activity Breakdown</h3>
                        {activityData.activities.map((activity, index) => (
                            <div key={index} className="p-4 border border-slate-200 rounded-lg hover:border-sky-300 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{activity.userName}</h4>
                                        {activity.projectName && (
                                            <p className="text-sm text-slate-500">{activity.projectName}</p>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getActivityColor(activity.activityPercentage)}`}>
                                        {activity.activityPercentage}% Active
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {formatDuration(activity.timeWorked)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!activityData && !error && (
                <div className="p-12 text-center">
                    <Activity className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">No activity data loaded. Click &quot;Sync Data&quot; to fetch from Hubstaff.</p>
                </div>
            )}
        </div>
    );
}
