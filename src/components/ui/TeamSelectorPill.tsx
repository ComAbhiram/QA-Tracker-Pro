import React, { useEffect, useState, useRef } from 'react';

interface Team {
    id: string;
    name: string;
}

interface TeamSelectorPillProps {
    teams: Team[];
    selectedTeamName: string | null;
    onSelect: (teamId: string, teamName: string) => void;
}

export const TeamSelectorPill = ({ teams, selectedTeamName, onSelect }: TeamSelectorPillProps) => {
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const tabsRef = useRef<(HTMLLabelElement | null)[]>([]);

    useEffect(() => {
        if (selectedTeamName && teams.length > 0) {
            const index = teams.findIndex(t => t.name === selectedTeamName);
            if (index !== -1 && tabsRef.current[index]) {
                const currentTab = tabsRef.current[index];
                if (currentTab) {
                    setIndicatorStyle({
                        left: currentTab.offsetLeft,
                        width: currentTab.offsetWidth
                    });
                }
            }
        }
    }, [selectedTeamName, teams]);

    if (!teams.length) return null;

    return (
        <div className="flex items-center justify-center w-full max-w-full overflow-hidden">
            <div className="overflow-x-auto pb-1 -mb-1 w-full flex justify-center no-scrollbar">
                {/* Pill Container - Uiverse Style */}
                <div
                    className="relative flex items-center bg-white dark:bg-slate-900 rounded-[3rem] p-1 gap-0 shadow-sm border border-slate-200 dark:border-slate-800 min-w-fit"
                >
                    {teams.map((team, index) => (
                        <label
                            key={team.id}
                            ref={el => { tabsRef.current[index] = el; }}
                            className={`relative px-3 py-1.5 rounded-[3rem] cursor-pointer font-semibold transition-colors duration-300 z-10 select-none text-center whitespace-nowrap text-xs ${selectedTeamName === team.name ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                            onClick={() => onSelect(team.id, team.name)}
                        >
                            {team.name}
                        </label>
                    ))}

                    {/* Sliding Indicator */}
                    <div
                        className="absolute bottom-0 top-0 my-1 bg-indigo-600 rounded-[3rem] transition-all duration-300 z-0 ease-[cubic-bezier(0.25,0.8,0.25,1)] shadow-md"
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TeamSelectorPill;
