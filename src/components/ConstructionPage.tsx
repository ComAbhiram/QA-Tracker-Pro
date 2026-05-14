
import { Construction } from 'lucide-react';

interface ConstructionPageProps {
    title: string;
    description: string;
}

export default function ConstructionPage({ title, description }: ConstructionPageProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 transition-colors">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-full mb-6 transition-colors">
                <Construction size={64} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 transition-colors">{title}</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 transition-colors">{description}</p>
            <div className="animate-pulse flex space-x-2">
                <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-500 rounded-full"></div>
                <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-500 rounded-full animation-delay-200"></div>
                <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-500 rounded-full animation-delay-400"></div>
            </div>
        </div>
    );
}
