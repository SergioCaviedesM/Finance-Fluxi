'use client';

import { Calendar } from 'lucide-react';

export default function FiltroFecha() {
    return (
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
                type="date"
                className="text-sm text-gray-700 focus:outline-none"
                defaultValue={new Date().toISOString().split('T')[0]}
            />
            <span className="text-gray-400">—</span>
            <input
                type="date"
                className="text-sm text-gray-700 focus:outline-none"
                defaultValue={new Date().toISOString().split('T')[0]}
            />
        </div>
    );
}
