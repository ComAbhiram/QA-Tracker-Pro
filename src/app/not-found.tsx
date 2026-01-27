import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-slate-50 p-6 rounded-full mb-6 animate-in zoom-in duration-300">
                <FileQuestion className="w-16 h-16 text-slate-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Page Not Found</h2>
            <p className="text-slate-500 max-w-md mb-8">
                Sorry, the page you are looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
                href="/"
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
            >
                <Home size={18} />
                Back to Dashboard
            </Link>
        </div>
    );
}
