'use client';

import { cn } from '@/lib/utils';

interface CurrencyToggleProps {
    value: 'COP' | 'USD';
    onChange: (value: 'COP' | 'USD') => void;
}

export default function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
    return (
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
                onClick={() => onChange('COP')}
                className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                    value === 'COP'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                )}
            >
                COP
            </button>
            <button
                onClick={() => onChange('USD')}
                className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                    value === 'USD'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                )}
            >
                USD
            </button>
        </div>
    );
}
