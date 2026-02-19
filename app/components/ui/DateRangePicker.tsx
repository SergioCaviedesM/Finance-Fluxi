'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DatePreset = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateRangePickerProps {
    value: DatePreset;
    onChange: (value: DatePreset) => void;
    customRange?: { start: Date; end: Date };
    onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}

const presets: Record<DatePreset, string> = {
    last7: 'Últimos 7 días',
    last30: 'Últimos 30 días',
    thisMonth: 'Este mes',
    lastMonth: 'Mes pasado',
    custom: 'Personalizado',
};

export default function DateRangePicker({
    value,
    onChange,
    customRange,
    onCustomRangeChange,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
          inline-flex items-center gap-2 px-4 py-2
          border border-gray-200 rounded-lg
          text-sm font-medium text-gray-700
          hover:bg-gray-50 transition-colors
        "
            >
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{presets[value]}</span>
                <ChevronDown className={cn(
                    'w-4 h-4 text-gray-400 transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="
            absolute z-20 right-0 mt-1 w-56
            bg-white border border-gray-200 rounded-lg shadow-lg
          ">
                        {(Object.keys(presets) as DatePreset[]).map((preset) => (
                            <div
                                key={preset}
                                onClick={() => {
                                    onChange(preset);
                                    if (preset !== 'custom') {
                                        setIsOpen(false);
                                    }
                                }}
                                className={cn(
                                    'px-4 py-2 text-sm cursor-pointer transition-colors',
                                    value === preset
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                )}
                            >
                                {presets[preset]}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
