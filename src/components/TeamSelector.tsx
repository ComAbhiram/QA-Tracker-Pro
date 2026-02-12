import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Team {
    id: string;
    name: string;
}

interface TeamSelectorProps {
    teams: Team[];
    selectedTeamName: string | null;
    onSelect: (teamName: string) => void;
}

export function TeamSelector({ teams, selectedTeamName, onSelect }: TeamSelectorProps) {
    return (
        <Select
            value={selectedTeamName || ""}
            onValueChange={onSelect}
        >
            <SelectTrigger className="w-full justify-between bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-md text-sm transition-colors outline-none focus:ring-2 focus:ring-indigo-500 border-0 h-auto">
                <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b mb-1">
                        Select Team
                    </SelectLabel>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {teams.map((team) => (
                            <SelectItem
                                key={team.id}
                                value={team.name}
                                className="cursor-pointer focus:bg-blue-500 focus:text-white"
                            >
                                {team.name}
                            </SelectItem>
                        ))}
                        {teams.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                                No teams available
                            </div>
                        )}
                    </div>
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
