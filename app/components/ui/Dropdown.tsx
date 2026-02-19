'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
    label: string;
    value: string;
}

interface DropdownProps {
    options: DropdownOption[];
    value: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    multiple?: boolean;
    className?: string;
}

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    multiple = false,
    className,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (optionValue: string) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            onChange(newValues);
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    const getDisplayValue = () => {
        if (multiple && Array.isArray(value)) {
            if (value.length === 0) return placeholder;
            if (value.length === 1) {
                return options.find(opt => opt.value === value[0])?.label || placeholder;
            }
            return `${value.length} seleccionados`;
        }
        return options.find(opt => opt.value === value)?.label || placeholder;
    };

    return (
        <div className={cn('relative', className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
          w-full px-4 py-2 text-left
          border border-gray-200 rounded-lg
          text-sm text-gray-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          flex items-center justify-between gap-2
          transition-all
        "
            >
                <span>{getDisplayValue()}</span>
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
            absolute z-20 w-full mt-1 
            bg-white border border-gray-200 rounded-lg shadow-lg
            max-h-60 overflow-auto
          ">
                        {options.map((option) => {
                            const isSelected = multiple
                                ? Array.isArray(value) && value.includes(option.value)
                                : value === option.value;

                            return (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'px-4 py-2 text-sm cursor-pointer transition-colors',
                                        isSelected
                                            ? 'bg-blue-50 text-blue-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {multiple && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        )}
                                        <span>{option.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
