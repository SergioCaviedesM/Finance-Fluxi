import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: number;
    currency?: 'COP' | 'USD';
    change?: number; // Percentage
    sparklineData?: number[];
    format?: 'currency' | 'number';
    icon?: React.ReactNode;
}

export default function StatCard({
    title,
    value,
    currency = 'COP',
    change,
    sparklineData,
    format = 'currency',
    icon,
}: StatCardProps) {
    const isPositive = change !== undefined && change >= 0;
    const formattedValue = format === 'currency'
        ? formatCurrency(value, currency)
        : formatNumber(value);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-[0_1px_3px_0_rgb(0_0_0_/0.05)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                {icon && <div className="text-gray-400">{icon}</div>}
            </div>

            {/* Value */}
            <div className="mb-3">
                <div className="text-3xl font-semibold text-gray-900 tracking-tight">
                    {formattedValue}
                </div>
            </div>

            {/* Change & Sparkline */}
            <div className="flex items-center justify-between">
                {change !== undefined && (
                    <div className="flex items-center gap-1">
                        {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span
                            className={cn(
                                'text-sm font-medium',
                                isPositive ? 'text-green-600' : 'text-red-600'
                            )}
                        >
                            {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                    </div>
                )}

                {sparklineData && sparklineData.length > 0 && (
                    <div className="h-8 w-20">
                        {/* Mini sparkline would go here - will implement Sparkline component */}
                        <svg className="w-full h-full" viewBox="0 0 80 32" preserveAspectRatio="none">
                            <polyline
                                fill="none"
                                stroke={isPositive ? '#10B981' : '#0EA5E9'}
                                strokeWidth="2"
                                points={sparklineData.map((v, i) => {
                                    const x = (i / (sparklineData.length - 1)) * 80;
                                    const max = Math.max(...sparklineData);
                                    const min = Math.min(...sparklineData);
                                    const y = 32 - ((v - min) / (max - min)) * 32;
                                    return `${x},${y}`;
                                }).join(' ')}
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
