import React from 'react';
import { Camera, ClipboardList } from 'lucide-react';

interface ReportActionsProps {
    onDownload: () => void;
    onCopy: () => void;
    loading?: boolean;
    disabled?: boolean;
    downloadLabel?: string;
    copyLabel?: string;
}

export const ReportActions = ({
    onDownload,
    onCopy,
    loading = false,
    disabled = false,
    downloadLabel = 'Download as Image',
    copyLabel = 'Copy as Text'
}: ReportActionsProps) => {
    return (
        <div className="flex flex-col bg-[#193f80] w-full p-2 rounded-3xl gap-1">
            <button
                onClick={onDownload}
                disabled={disabled || loading}
                className="group relative bg-[#225bc3] hover:bg-[#2564da] hover:scale-[1.02] hover:translate-y-[-2px] hover:rounded-[23px] hover:rounded-bl-none hover:rounded-br-none px-6 py-3 rounded-2xl rounded-bl-lg rounded-br-lg transition-all text-center text-[#d8e5f9] hover:text-[#a8c1f0] font-medium cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-[#d8e5f9] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <Camera size={18} />
                )}
                <span>{loading ? 'Generating...' : downloadLabel}</span>
            </button>
            <button
                onClick={onCopy}
                disabled={disabled || loading}
                className="group relative bg-[#5350c6] hover:bg-[#6461db] hover:scale-[1.02] hover:translate-y-[2px] hover:rounded-[23px] hover:rounded-tl-none hover:rounded-tr-none px-6 py-3 rounded-2xl rounded-tl-lg rounded-tr-lg transition-all text-center text-[#d8e5f9] hover:text-[#b3aaee] font-medium cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
                <ClipboardList size={18} />
                <span>{copyLabel}</span>
            </button>
        </div>
    );
};

export default ReportActions;
