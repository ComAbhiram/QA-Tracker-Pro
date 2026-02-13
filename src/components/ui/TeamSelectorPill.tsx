import React, { useEffect, useState, useRef } from 'react';

interface Team {
    id: string;
    name: string;
}

interface TeamSelectorPillProps {
    teams: Team[];
    selectedTeamName: string | null;
    onSelect: (teamName: string) => void;
}

export const TeamSelectorPill = ({ teams, selectedTeamName, onSelect }: TeamSelectorPillProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (selectedTeamName && teams.length > 0) {
            const index = teams.findIndex(t => t.name === selectedTeamName);
            if (index !== -1) {
                setCurrentIndex(index);
            }
        }
    }, [selectedTeamName, teams]);

    if (!teams.length) return null;

    return (
        <div className="flex items-center justify-center">
            {/* Pill Container - Uiverse Style */}
            <div
                className="relative flex items-center bg-[#1a1a1a] rounded-[3rem] p-1 gap-0 shadow-[inset_0_0_20px_#000]"
                style={{
                    '--total-options': teams.length,
                    '--main-color': '#ff6ec4',
                    '--secondary-color': '#7873f5'
                } as React.CSSProperties}
            >
                {teams.map((team, index) => (
                    <label
                        key={team.id}
                        className={`relative px-6 py-2 rounded-[3rem] cursor-pointer font-semibold transition-colors duration-300 z-10 select-none text-center flex-1 whitespace-nowrap ${selectedTeamName === team.name ? 'text-white' : 'text-[#ddd] hover:text-[#ff6ec4]'
                            }`}
                        onClick={() => onSelect(team.name)}
                    >
                        {team.name}
                    </label>
                ))}

                {/* Sliding Indicator */}
                <div
                    className="absolute bottom-[5px] left-0 h-[4px] bg-gradient-to-r from-[#ff6ec4] to-[#7873f5] rounded-[2px] transition-transform duration-300 z-0 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                    style={{
                        width: `calc(100% / ${teams.length})`,
                        transform: `translateX(${currentIndex * 100}%)`
                    }}
                />
            </div>
        </div>
    );
};

export default TeamSelectorPill;
