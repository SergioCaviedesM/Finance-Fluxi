"use client";

import React, { useEffect, useState, useMemo } from "react";
import UnitEconomics from "@/app/components/UnitEconomics";
import Simulator from "@/app/components/Simulator";
import {
    RefreshCw,
    Users,
    DollarSign,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    UserPlus,
    UserMinus,
    Target,
    Info,
    CreditCard,
    LayoutDashboard,
    Calculator,
} from "lucide-react";
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
    ComposedChart,
} from "recharts";

interface Summary {
    mrr: number;
    arr: number;
    activeSubscribers: number;
    pastDueSubscribers: number;
    churnRate: number;
    churnBenchmark: number;
    arpu: number;
    ltv: number;
    totalSubscriptions: number;
    validSubscriptions: number;
}

interface MonthlyGrowth {
    month: string;
    nuevos: number;
    cancelaciones: number;
    neto: number;
    mrrGain: number;
    mrrLoss: number;
    churnRate: number;
    activosInicio: number;
    activosFin: number;
}

interface CohortData {
    cohort: string;
    totalUsers: number;
    retention: number[];
    retentionPct: number[];
}

interface SubscriberHistory {
    month: string;
    activeSubscribers: number;
    mrr: number;
}

interface DailyActive {
    date: string;
    activos: number;
    mrr: number;
}

interface PlanData {
    planId: string;
    count: number;
    mrr: number;
}

interface ArpuMensual {
    mes: string;
    mesLabel: string;
    pagos: number;
    revenue: number;
    revenueCOP: number;
    arpu: number;
    arpuCOP: number;
}

interface ArpuResponse {
    success: boolean;
    trm: number;
    arpuMesActual: number;
    arpuMesActualCOP: number;
    mesActual: string;
    mrrActual: number;
    mrrActualCOP: number;
    resumen: {
        totalRevenue: number;
        totalRevenueCOP: number;
        totalPagos: number;
        arpuGlobal: number;
        arpuGlobalCOP: number;
        mesesConDatos: number;
    };
    arpuMensual: ArpuMensual[];
}

type DateFilter = 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time' | 'custom';

const MONTHS_ES: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'last_3_months', label: 'Últimos 3 meses' },
    { value: 'last_6_months', label: 'Últimos 6 meses' },
    { value: 'this_year', label: 'Este año' },
    { value: 'all_time', label: 'Todo el tiempo' },
    { value: 'custom', label: 'Personalizado' },
];

const PLAN_NAMES: Record<string, string> = {
    'price_1Rc1ARD5SGc1lExeO8XreLBU': 'Plan Básico ($50)',
    'price_1Rc1BlD5SGc1lExenwzNjTVP': 'Plan Pro ($150)',
};

// Colores corporativos
const COLORS = {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    success: '#10B981',
    successLight: '#34D399',
    danger: '#EF4444',
    dangerLight: '#F87171',
    warning: '#F59E0B',
    gray: '#6B7280',
    grayLight: '#9CA3AF',
    gridLine: '#F3F4F6',
    tooltipBg: '#1F2937',
};

// Tasa de cambio USD a COP
const TASA_CAMBIO = 4200;

export default function SuscriptoresPage() {
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'USD' | 'COP'>('USD');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all_time');
    const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
        start: '',
        end: new Date().toISOString().split('T')[0],
    });
    const [activeTab, setActiveTab] = useState<'dashboard' | 'unit-economics' | 'simulator'>('dashboard');
    const [summary, setSummary] = useState<Summary | null>(null);
    const [byStatus, setByStatus] = useState<Record<string, number>>({});
    const [byPlan, setByPlan] = useState<PlanData[]>([]);
    const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowth[]>([]);
    const [cohortAnalysis, setCohortAnalysis] = useState<CohortData[]>([]);
    const [subscriberHistory, setSubscriberHistory] = useState<SubscriberHistory[]>([]);
    const [dailyActive, setDailyActive] = useState<DailyActive[]>([]);
    const [recentCancellations, setRecentCancellations] = useState<Array<{
        email: string;
        name: string;
        created: Date;
        canceledAt: Date;
        plan: string;
        mrr: number;
    }>>([]);
    const [loyalSubscribers, setLoyalSubscribers] = useState<Array<{
        email: string;
        name: string;
        created: Date;
        plan: string;
        mrr: number;
        monthsActive: number;
    }>>([]);
    const [arpuData, setArpuData] = useState<ArpuResponse | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subscriptionsRes, arpuRes] = await Promise.all([
                fetch(`/api/subscriptions?currency=${currency}`),
                fetch('/api/arpu')
            ]);

            const result = await subscriptionsRes.json();
            if (result.success) {
                setSummary(result.summary);
                setByStatus(result.byStatus || {});
                setByPlan(result.byPlan || []);
                setMonthlyGrowth(result.monthlyGrowth || []);
                setCohortAnalysis(result.cohortAnalysis || []);
                setSubscriberHistory(result.subscriberHistory || []);
                setDailyActive(result.dailyActive || []);
                setRecentCancellations(result.recentCancellations || []);
                setLoyalSubscribers(result.loyalSubscribers || []);
            }

            const arpuResult = await arpuRes.json();
            if (arpuResult.success) {
                setArpuData(arpuResult);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currency]);

    const getDateRange = (): { start: Date; end: Date } => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
            case 'last_3_months':
                return { start: new Date(today.getFullYear(), today.getMonth() - 3, 1), end: now };
            case 'last_6_months':
                return { start: new Date(today.getFullYear(), today.getMonth() - 6, 1), end: now };
            case 'this_year':
                return { start: new Date(today.getFullYear(), 0, 1), end: now };
            case 'custom':
                return {
                    start: customDateRange.start ? new Date(customDateRange.start) : new Date(2020, 0, 1),
                    end: customDateRange.end ? new Date(customDateRange.end) : now,
                };
            case 'all_time':
            default:
                return { start: new Date(2020, 0, 1), end: now };
        }
    };



    const filteredMonthlyGrowth = useMemo(() => {
        const { start, end } = getDateRange();
        return monthlyGrowth.filter(m => {
            const monthDate = new Date(m.month + '-01');
            return monthDate >= start && monthDate <= end;
        });
    }, [monthlyGrowth, dateFilter]);

    const filteredSubscriberHistory = useMemo(() => {
        const { start, end } = getDateRange();
        return subscriberHistory.filter(h => {
            const monthDate = new Date(h.month + '-01');
            return monthDate >= start && monthDate <= end;
        });
    }, [subscriberHistory, dateFilter]);

    const filteredCohorts = useMemo(() => {
        const { start } = getDateRange();
        return cohortAnalysis.filter(c => {
            const cohortDate = new Date(c.cohort + '-01');
            return cohortDate >= start;
        });
    }, [cohortAnalysis, dateFilter]);

    const filteredDailyActive = useMemo(() => {
        const { start, end } = getDateRange();
        return dailyActive.filter(d => {
            const date = new Date(d.date);
            return date >= start && date <= end;
        });
    }, [dailyActive, dateFilter]);

    const filteredMetrics = useMemo(() => {
        if (filteredMonthlyGrowth.length === 0) {
            return {
                avgChurnRate: summary?.churnRate ?? 0,
                totalNuevos: 0,
                totalCancelaciones: 0,
                netGrowth: 0,
                avgMrr: summary?.mrr ?? 0,
            };
        }

        // Churn rate promedio del período
        const avgChurnRate = filteredMonthlyGrowth.reduce((sum, m) => sum + m.churnRate, 0) / filteredMonthlyGrowth.length;

        // Totales del período
        const totalNuevos = filteredMonthlyGrowth.reduce((sum, m) => sum + m.nuevos, 0);
        const totalCancelaciones = filteredMonthlyGrowth.reduce((sum, m) => sum + m.cancelaciones, 0);
        const netGrowth = totalNuevos - totalCancelaciones;

        // MRR del último mes del período filtrado
        const lastMonthData = filteredSubscriberHistory[filteredSubscriberHistory.length - 1];
        const currentMrr = lastMonthData?.mrr ?? summary?.mrr ?? 0;

        // Nuevos y cancelaciones del último mes del período
        const lastGrowthData = filteredMonthlyGrowth[filteredMonthlyGrowth.length - 1];

        return {
            avgChurnRate,
            totalNuevos,
            totalCancelaciones,
            netGrowth,
            currentMrr,
            lastMonthNuevos: lastGrowthData?.nuevos ?? 0,
            lastMonthCancelaciones: lastGrowthData?.cancelaciones ?? 0,
            lastMonthMrrGain: lastGrowthData?.mrrGain ?? 0,
            lastMonthMrrLoss: lastGrowthData?.mrrLoss ?? 0,
        };
    }, [filteredMonthlyGrowth, filteredSubscriberHistory, summary]);

    // Datos formateados para Recharts
    const subscriberChartData = useMemo(() => {
        return filteredSubscriberHistory.map(h => ({
            ...h,
            monthLabel: formatMonth(h.month),
        }));
    }, [filteredSubscriberHistory]);

    const churnChartData = useMemo(() => {
        return filteredMonthlyGrowth.map((m, idx, arr) => {
            // Calcular tendencia (regresión lineal)
            const n = arr.length;
            if (n < 2) return { ...m, monthLabel: formatMonth(m.month), tendencia: m.churnRate };

            const xSum = (n * (n - 1)) / 2;
            const ySum = arr.reduce((sum, item) => sum + item.churnRate, 0);
            const xySum = arr.reduce((sum, item, i) => sum + i * item.churnRate, 0);
            const x2Sum = arr.reduce((sum, _, i) => sum + i * i, 0);

            const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
            const intercept = (ySum - slope * xSum) / n;
            const tendencia = intercept + slope * idx;

            return {
                ...m,
                monthLabel: formatMonth(m.month),
                tendencia: Math.max(0, tendencia),
            };
        });
    }, [filteredMonthlyGrowth]);

    const dailyChartData = useMemo(() => {
        // Reducir puntos si hay muchos (tomar cada N días)
        const data = filteredDailyActive;
        if (data.length <= 30) return data.map(d => ({ ...d, dateLabel: formatDateShort(d.date) }));

        const step = Math.ceil(data.length / 30);
        return data
            .filter((_, idx) => idx % step === 0 || idx === data.length - 1)
            .map(d => ({ ...d, dateLabel: formatDateShort(d.date) }));
    }, [filteredDailyActive]);

    const growthChartData = useMemo(() => {
        return filteredMonthlyGrowth.map(m => ({
            ...m,
            monthLabel: formatMonth(m.month),
            cancelacionesNeg: -m.cancelaciones, // Para mostrar hacia abajo
        }));
    }, [filteredMonthlyGrowth]);

    const formatCurrency = (value: number | null | undefined) => {
        const val = value ?? 0;
        if (currency === 'COP') {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(val);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    const formatCurrencyCompact = (value: number | null | undefined) => {
        const val = value ?? 0;
        if (currency === 'COP') {
            if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
            if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
        } else {
            if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        }
        return formatCurrency(val);
    };

    function formatMonth(monthStr: string | null | undefined): string {
        if (!monthStr) return 'N/A';
        const parts = monthStr.split('-');
        if (parts.length < 2) return monthStr;
        const [year, month] = parts;
        return `${MONTHS_ES[month] || month} ${year?.slice(2) || ''}`;
    }

    function formatDateShort(dateStr: string): string {
        const date = new Date(dateStr);
        return `${date.getDate()} ${MONTHS_ES[String(date.getMonth() + 1).padStart(2, '0')]}`;
    }

    const getRetentionColor = (pct: number): string => {
        if (pct >= 80) return 'bg-emerald-500 text-white';
        if (pct >= 60) return 'bg-emerald-400 text-white';
        if (pct >= 40) return 'bg-amber-400 text-gray-900';
        if (pct >= 20) return 'bg-orange-400 text-white';
        return 'bg-red-500 text-white';
    };

    // Calcular si la tendencia mejora o empeora
    const churnTrendDirection = useMemo(() => {
        if (churnChartData.length < 2) return 'stable';
        const first = churnChartData[0]?.tendencia || 0;
        const last = churnChartData[churnChartData.length - 1]?.tendencia || 0;
        return last < first ? 'improving' : 'worsening';
    }, [churnChartData]);

    // Custom Tooltip Components
    const SubscriberTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-lg font-semibold">{data.activeSubscribers?.toLocaleString()} suscriptores</p>
                <p className="text-sm text-gray-400">MRR: {formatCurrency(data.mrr)}</p>
            </div>
        );
    };

    const ChurnTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-lg font-semibold text-red-400">{data.churnRate?.toFixed(1)}% churn</p>
                <div className="text-sm text-gray-400 mt-1 space-y-0.5">
                    <p>{data.cancelaciones} cancelaciones</p>
                    <p>{data.activosInicio} activos al inicio</p>
                </div>
            </div>
        );
    };

    const DailyTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">{data.date}</p>
                <p className="text-lg font-semibold">{data.activos?.toLocaleString()} activos</p>
                <p className="text-sm text-gray-400">MRR: {formatCurrency(data.mrr)}</p>
            </div>
        );
    };

    const GrowthTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-2">{label}</p>
                <div className="space-y-1">
                    <p className="text-emerald-400">+{data.nuevos} nuevos</p>
                    <p className="text-red-400">-{data.cancelaciones} cancelaciones</p>
                    <p className={`font-semibold ${data.neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Neto: {data.neto >= 0 ? '+' : ''}{data.neto}
                    </p>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando datos de suscriptores...
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-red-500">Error al cargar datos</p>
            </div>
        );
    }

    const churnBenchmark = summary.churnBenchmark || 5;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Dashboard de Suscriptores</h1>
                        <p className="text-sm text-gray-500">Métricas de retención y análisis de cohortes</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {DATE_FILTER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {dateFilter === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customDateRange.start}
                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-gray-400">—</span>
                                <input
                                    type="date"
                                    value={customDateRange.end}
                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                USD
                            </button>
                            <button
                                onClick={() => setCurrency('COP')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'COP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                COP
                            </button>
                        </div>

                        <button
                            onClick={fetchData}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 px-8">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${activeTab === 'dashboard'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('unit-economics')}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${activeTab === 'unit-economics'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Calculator className="w-4 h-4" />
                        Unit Economics
                    </button>
                    <button
                        onClick={() => setActiveTab('simulator')}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${activeTab === 'simulator'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Simulador
                    </button>
                </div>
            </div>

            {activeTab === 'unit-economics' ? (
                <div className="p-8">
                    <UnitEconomics currency={currency} />
                </div>
            ) : activeTab === 'simulator' ? (
                <div className="p-8">
                    <Simulator currency={currency} />
                </div>
            ) : (
                <div className="p-8 space-y-6">
                    {/* KPIs Principales */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <DollarSign className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="text-sm text-gray-500">MRR</span>
                            </div>
                            {(() => {
                                const mrr = currency === 'COP' ? (arpuData?.mrrActualCOP ?? 0) : (arpuData?.mrrActual ?? 0);
                                const arr = mrr * 12;
                                return (
                                    <>
                                        <p className="text-2xl font-bold text-gray-900">{formatCurrencyCompact(mrr)}</p>
                                        <p className="text-xs text-gray-400 mt-1">ARR: {formatCurrencyCompact(arr)}</p>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-sm text-gray-500">Suscriptores Activos</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{summary.activeSubscribers.toLocaleString()}</p>
                            {summary.pastDueSubscribers > 0 && (
                                <p className="text-xs text-amber-500 mt-1">{summary.pastDueSubscribers} con pago vencido</p>
                            )}
                        </div>

                        {(() => {
                            const currentMonth = monthlyGrowth.length > 0 ? monthlyGrowth[monthlyGrowth.length - 1] : null;
                            const churnRate = currentMonth?.churnRate ?? 0;
                            return (
                                <div className="bg-white rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg ${churnRate > churnBenchmark ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                            <AlertTriangle className={`w-5 h-5 ${churnRate > churnBenchmark ? 'text-red-600' : 'text-emerald-600'}`} />
                                        </div>
                                        <span className="text-sm text-gray-500">Churn Rate</span>
                                    </div>
                                    <p className={`text-2xl font-bold ${churnRate > churnBenchmark ? 'text-red-600' : 'text-gray-900'}`}>
                                        {churnRate.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Mes presente</p>
                                </div>
                            );
                        })()}

                        {(() => {
                            const arpu = currency === 'COP' ? (arpuData?.arpuMesActualCOP ?? 0) : (arpuData?.arpuMesActual ?? 0);
                            return (
                                <div className="bg-white rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Target className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="text-sm text-gray-500">ARPU</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(arpu)}</p>
                                    <p className="text-xs text-gray-400 mt-1">Mes actual: {arpuData?.mesActual ?? 'N/A'}</p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* KPIs Secundarios */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Nuevos (último mes)</span>
                                <UserPlus className="w-4 h-4 text-emerald-500" />
                            </div>
                            <p className="text-xl font-bold text-emerald-600 mt-1">
                                +{filteredMetrics.lastMonthNuevos}
                            </p>
                            <p className="text-xs text-gray-400">Total período: +{filteredMetrics.totalNuevos}</p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Cancelaciones (último mes)</span>
                                <UserMinus className="w-4 h-4 text-red-500" />
                            </div>
                            <p className="text-xl font-bold text-red-600 mt-1">
                                -{filteredMetrics.lastMonthCancelaciones}
                            </p>
                            <p className="text-xs text-gray-400">Total período: -{filteredMetrics.totalCancelaciones}</p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Total Histórico</span>
                                <Users className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalSubscriptions.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{summary.validSubscriptions.toLocaleString()} válidas</p>
                        </div>

                        {(() => {
                            const arpu = currency === 'COP' ? (arpuData?.arpuMesActualCOP ?? 0) : (arpuData?.arpuMesActual ?? 0);
                            const currentMonth = monthlyGrowth.length > 0 ? monthlyGrowth[monthlyGrowth.length - 1] : null;
                            const churnRate = currentMonth?.churnRate ?? 0;
                            const ltv = churnRate > 0 ? arpu * (100 / churnRate) : arpu * 24;
                            return (
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">LTV</span>
                                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <p className="text-xl font-bold text-indigo-600 mt-1">
                                        {formatCurrencyCompact(ltv)}
                                    </p>
                                    <p className="text-xs text-gray-400">ARPU × (1/Churn)</p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Gráficas Row 1 */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Histórico de Suscriptores */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-base font-semibold text-gray-900">Histórico de Suscriptores</h2>
                                {subscriberChartData.length > 0 && (
                                    <span className="text-sm font-medium text-indigo-600">
                                        {subscriberChartData[subscriberChartData.length - 1]?.activeSubscribers.toLocaleString()} activos
                                    </span>
                                )}
                            </div>
                            <div className="h-64">
                                {subscriberChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={subscriberChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                            <XAxis
                                                dataKey="monthLabel"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: COLORS.grayLight, fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: COLORS.grayLight, fontSize: 12 }}
                                                dx={-10}
                                                tickFormatter={(val) => val.toLocaleString()}
                                            />
                                            <Tooltip content={<SubscriberTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="activeSubscribers"
                                                stroke={COLORS.primary}
                                                strokeWidth={2}
                                                fill="url(#subscriberGradient)"
                                                dot={{ fill: COLORS.primary, strokeWidth: 0, r: 4 }}
                                                activeDot={{ fill: COLORS.primary, strokeWidth: 2, stroke: '#fff', r: 6 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                                )}
                            </div>
                        </div>

                        {/* Churn Rate */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-semibold text-gray-900">Churn Rate Mensual</h2>
                                    <div className="group relative">
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            Churn = Cancelaciones ÷ Activos al inicio del mes
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${churnTrendDirection === 'improving' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {churnTrendDirection === 'improving' ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                    {churnTrendDirection === 'improving' ? 'Mejorando' : 'Empeorando'}
                                </div>
                            </div>
                            <div className="h-64">
                                {churnChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={churnChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={COLORS.danger} stopOpacity={0.15} />
                                                    <stop offset="100%" stopColor={COLORS.danger} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                            <XAxis
                                                dataKey="monthLabel"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: COLORS.grayLight, fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: COLORS.grayLight, fontSize: 12 }}
                                                dx={-10}
                                                tickFormatter={(val) => `${val}%`}
                                            />
                                            <Tooltip content={<ChurnTooltip />} />
                                            <ReferenceLine
                                                y={churnBenchmark}
                                                stroke={COLORS.success}
                                                strokeDasharray="6 4"
                                                strokeWidth={1.5}
                                                label={{ value: `Meta: ${churnBenchmark}%`, position: 'right', fill: COLORS.success, fontSize: 11 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="churnRate"
                                                stroke="transparent"
                                                fill="url(#churnGradient)"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="churnRate"
                                                stroke={COLORS.danger}
                                                strokeWidth={2}
                                                dot={{ fill: COLORS.danger, strokeWidth: 0, r: 4 }}
                                                activeDot={{ fill: COLORS.danger, strokeWidth: 2, stroke: '#fff', r: 6 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="tendencia"
                                                stroke={COLORS.dangerLight}
                                                strokeWidth={1.5}
                                                strokeDasharray="8 4"
                                                dot={false}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-red-500 rounded"></div>
                                    <span>Churn real</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-red-300 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #F87171, #F87171 4px, transparent 4px, transparent 8px)' }}></div>
                                    <span>Tendencia</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981, #10B981 4px, transparent 4px, transparent 8px)' }}></div>
                                    <span>Benchmark</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráficas Row 2 */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* ARPU Mensual */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-base font-semibold text-gray-900">ARPU Mensual</h2>
                                <span className="text-xs text-gray-400">
                                    {arpuData?.resumen?.mesesConDatos ?? 0} meses | TRM: ${arpuData?.trm?.toLocaleString('es-CO', { maximumFractionDigits: 2 }) ?? 'N/A'}
                                </span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {arpuData?.arpuMensual && arpuData.arpuMensual.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50/80 sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Mes</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Pagos</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Revenue</th>
                                                <th className="text-right px-4 py-2.5 font-medium text-gray-500">ARPU</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {[...arpuData.arpuMensual].reverse().map((m: any) => {
                                                const getArpuColor = (arpu: number) => {
                                                    if (arpu >= 40) return 'bg-emerald-500 text-white';
                                                    if (arpu >= 30) return 'bg-emerald-400 text-white';
                                                    if (arpu >= 20) return 'bg-amber-400 text-gray-900';
                                                    return 'bg-orange-400 text-white';
                                                };
                                                const revenueDisplay = currency === 'COP' ? (m.revenueCOP ?? 0) : (m.revenue ?? 0);
                                                const arpuDisplay = currency === 'COP' ? (m.arpuCOP ?? 0) : (m.arpu ?? 0);
                                                return (
                                                    <tr key={m.mes} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-4 py-2.5 font-medium text-gray-900">{m.mesLabel}</td>
                                                        <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">{m.pagos?.toLocaleString()}</td>
                                                        <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">{formatCurrencyCompact(revenueDisplay)}</td>
                                                        <td className="text-right px-4 py-2">
                                                            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums ${getArpuColor(m.arpu)}`}>
                                                                {formatCurrency(arpuDisplay)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-gray-400">No hay datos de ARPU</div>
                                )}
                            </div>
                        </div>

                        {/* Crecimiento de Suscriptores - Estilo Stripe */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-base font-semibold text-gray-900">Crecimiento de los suscriptores activos</h2>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-3xl font-bold text-gray-900">
                                    {subscriberChartData.length > 0
                                        ? subscriberChartData[subscriberChartData.length - 1]?.activeSubscribers?.toLocaleString()
                                        : '0'}
                                </span>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Suscriptores activos actuales
                                    </div>
                                </div>
                            </div>
                            <div className="h-52">
                                {growthChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={growthChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                            <XAxis
                                                dataKey="monthLabel"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: COLORS.grayLight, fontSize: 11 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: COLORS.grayLight, fontSize: 11 }}
                                                tickFormatter={(val) => val > 0 ? `+${val}` : val}
                                            />
                                            <Tooltip content={<GrowthTooltip />} />
                                            <ReferenceLine y={0} stroke={COLORS.gray} strokeWidth={1} />

                                            {/* Barras de nuevos (hacia arriba - morado) */}
                                            <Bar
                                                dataKey="nuevos"
                                                fill="#8B5CF6"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={50}
                                            />

                                            {/* Barras de cancelaciones (hacia abajo - naranja) */}
                                            <Bar
                                                dataKey="cancelacionesNeg"
                                                fill="#F59E0B"
                                                radius={[0, 0, 4, 4]}
                                                maxBarSize={50}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                                )}
                            </div>
                            {/* Leyenda */}
                            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-violet-500 rounded"></div>
                                    <span>Nuevos</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-amber-500 rounded"></div>
                                    <span>Cancelaciones</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Heatmap de Cohortes */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-gray-900">Análisis de Cohortes - Retención</h2>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        % de usuarios de cada cohorte que permanecen activos en cada mes de vida
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-gray-400 mr-2">Retención:</span>
                                <div className="w-6 h-4 bg-red-500 rounded text-[10px] text-white flex items-center justify-center">0</div>
                                <div className="w-6 h-4 bg-orange-400 rounded text-[10px] text-white flex items-center justify-center">20</div>
                                <div className="w-6 h-4 bg-amber-400 rounded text-[10px] text-gray-900 flex items-center justify-center">40</div>
                                <div className="w-6 h-4 bg-emerald-400 rounded text-[10px] text-white flex items-center justify-center">60</div>
                                <div className="w-6 h-4 bg-emerald-500 rounded text-[10px] text-white flex items-center justify-center">80</div>
                                <span className="text-gray-400 ml-1">%</span>
                            </div>
                        </div>

                        {filteredCohorts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-4 font-medium text-gray-500 bg-gray-50/50 sticky left-0 z-10">Cohorte</th>
                                            <th className="text-center py-3 px-3 font-medium text-gray-500 bg-gray-50/50">Usuarios</th>
                                            {(() => {
                                                const maxMonths = Math.max(...filteredCohorts.map(c => c.retentionPct.length), 0);
                                                return [...Array(maxMonths)].map((_, i) => (
                                                    <th key={i} className="text-center py-3 px-2 font-medium text-gray-500 bg-gray-50/50 min-w-[56px]">
                                                        Mes {i + 1}
                                                    </th>
                                                ));
                                            })()}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const maxMonths = Math.max(...filteredCohorts.map(c => c.retentionPct.length), 0);
                                            return filteredCohorts.map((cohort, idx) => (
                                                <tr key={cohort.cohort} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                                    <td className="py-2.5 px-4 font-medium text-gray-900 sticky left-0 z-10 bg-inherit">{formatMonth(cohort.cohort)}</td>
                                                    <td className="py-2.5 px-3 text-center text-gray-600 font-medium">{cohort.totalUsers}</td>
                                                    {[...Array(maxMonths)].map((_, i) => {
                                                        const pct = cohort.retentionPct[i];
                                                        const retentionCount = cohort.retention[i];

                                                        if (pct === undefined) {
                                                            return <td key={i} className="py-2 px-1"></td>;
                                                        }

                                                        // Calcular el nombre del mes calendario para el tooltip
                                                        const [y, m] = cohort.cohort.split('-').map(Number);
                                                        const evalDate = new Date(y, m - 1 + i, 1);
                                                        const monthName = formatMonth(evalDate.getFullYear() + '-' + String(evalDate.getMonth() + 1).padStart(2, '0'));

                                                        return (
                                                            <td key={i} className="py-2 px-1">
                                                                <div
                                                                    className={`mx-auto w-12 py-1.5 text-center text-xs font-semibold rounded-md ${getRetentionColor(pct)} transition-transform hover:scale-110 cursor-default`}
                                                                    title={`${retentionCount} de ${cohort.totalUsers} usuarios activos en ${monthName} (${pct}%)`}
                                                                >
                                                                    {pct}%
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">No hay datos de cohortes</div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Columna Izquierda */}
                        <div className="space-y-6">
                            {/* Últimos Suscriptores Perdidos */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-gray-900">Últimos Suscriptores Perdidos</h2>
                                    <span className="text-xs text-gray-400">Últimos 10</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {recentCancellations.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50/80 sticky top-0">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Suscriptor</th>
                                                    <th className="text-left px-3 py-2.5 font-medium text-gray-500">Fecha</th>
                                                    <th className="text-right px-4 py-2.5 font-medium text-gray-500">Tiempo de vida</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {recentCancellations.map((sub, idx) => {
                                                    const created = new Date(sub.created);
                                                    const canceled = new Date(sub.canceledAt);
                                                    const diffTime = Math.abs(canceled.getTime() - created.getTime());
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    const lifetime = diffDays < 30
                                                        ? `${diffDays} días`
                                                        : `${Math.floor(diffDays / 30)} meses`;

                                                    return (
                                                        <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <p className="font-medium text-gray-900 truncate max-w-[200px]">{sub.name || 'Sin nombre'}</p>
                                                                <p className="text-xs text-gray-400 truncate max-w-[200px]">{sub.email}</p>
                                                            </td>
                                                            <td className="px-3 py-3 text-gray-600">
                                                                {new Date(sub.canceledAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-600 font-medium">
                                                                {lifetime}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-8 text-center text-gray-400">No hay cancelaciones recientes</div>
                                    )}
                                </div>
                            </div>

                            {/* Detalle Mensual */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-gray-900">Detalle Mensual</h2>
                                    <span className="text-xs text-gray-400">Últimos meses</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50/80 sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Mes</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Inicio</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-emerald-600">+</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-red-500">−</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Churn</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredMonthlyGrowth.slice().reverse().map(m => (
                                                <tr key={m.month} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-2.5 font-medium text-gray-900">{formatMonth(m.month)}</td>
                                                    <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">{m.activosInicio}</td>
                                                    <td className="text-right px-3 py-2.5 text-emerald-600 font-medium tabular-nums">+{m.nuevos}</td>
                                                    <td className="text-right px-3 py-2.5 text-red-500 font-medium tabular-nums">−{m.cancelaciones}</td>
                                                    <td className={`text-right px-3 py-2.5 font-semibold tabular-nums ${m.churnRate > churnBenchmark ? 'text-red-500' : 'text-emerald-600'}`}>
                                                        {m.churnRate.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-6">
                            {/* Suscriptores Más Fieles */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-gray-900">🏆 Suscriptores Más Fieles</h2>
                                    <span className="text-xs text-gray-400">Top 10 por antigüedad</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {loyalSubscribers.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50/80 sticky top-0">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Suscriptor</th>
                                                    <th className="text-center px-3 py-2.5 font-medium text-gray-500">Meses</th>
                                                    <th className="text-right px-4 py-2.5 font-medium text-gray-500">Total pagado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {loyalSubscribers.map((sub, idx) => {
                                                    const avgArpuUSD = 33;
                                                    const totalUSD = sub.monthsActive * avgArpuUSD;
                                                    const totalDisplay = currency === 'COP'
                                                        ? totalUSD * (arpuData?.trm || 4200)
                                                        : totalUSD;

                                                    return (
                                                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {idx < 3 && (
                                                                        <span className={`text-lg ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-amber-600'}`}>
                                                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                                                        </span>
                                                                    )}
                                                                    <div>
                                                                        <p className="font-medium text-gray-900 truncate max-w-[180px]">{sub.name || 'Sin nombre'}</p>
                                                                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{sub.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                                    {sub.monthsActive} meses
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                                                                {formatCurrency(totalDisplay)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-8 text-center text-gray-400">No hay datos</div>
                                    )}
                                </div>
                            </div>

                            {/* Estado de Suscripciones */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-gray-900">Estado de Suscripciones</h2>
                                    <span className="text-xs text-gray-400">Total: {summary.totalSubscriptions.toLocaleString()}</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50/80 sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Estado</th>
                                                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Cantidad</th>
                                                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Porcentaje</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {Object.entries(byStatus)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([status, count]) => {
                                                    const total = summary.totalSubscriptions || 1;
                                                    const percent = (count / total) * 100;
                                                    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
                                                        active: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Activos' },
                                                        canceled: { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Cancelados' },
                                                        past_due: { color: 'text-red-700', bg: 'bg-red-100', label: 'Pago vencido' },
                                                        incomplete: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'Incompleto' },
                                                        incomplete_expired: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'Expirado' },
                                                    };
                                                    const config = statusConfig[status] || { color: 'text-gray-700', bg: 'bg-gray-100', label: status };

                                                    return (
                                                        <tr key={status} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                                                                    {config.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-right text-gray-900 font-medium tabular-nums">
                                                                {count.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                                                                {percent.toFixed(1)}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}