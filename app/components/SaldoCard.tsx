'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SaldoCardProps {
    title: string;
    amount: number;
    currency: 'COP' | 'USD';
    trend?: {
        value: number;
        isPositive: boolean;
    };
    icon?: React.ReactNode;
}

export default function SaldoCard({
    title,
    amount,
    currency,
    trend,
    icon
}: SaldoCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                {icon && <div className="text-gray-400">{icon}</div>}
            </div>

            {/* Amount */}
            <div className="mb-2">
                <p className="text-3xl font-bold text-[#0A2540]">
                    {formatCurrency(amount, currency)}
                </p>
            </div>

            {/* Trend */}
            {trend && (
                <div className="flex items-center gap-1">
                    {trend.isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
                </div>
            )}
        </div>
    );
}
