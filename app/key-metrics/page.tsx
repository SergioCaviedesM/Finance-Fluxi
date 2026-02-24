"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    RefreshCw,
    TrendingDown,
    TrendingUp,
    DollarSign,
    Clock,
    Flame,
    Info,
    Users,
    Percent,
    Hash,
    LayoutGrid,
} from "lucide-react";
import {
    LineChart,
    Line,
    Bar,
    ComposedChart,
    Area,
    AreaChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────
interface Transaction {
    banco: string;
    fecha: string;
    descripcion: string;
    naturaleza: string;
    clasificacion: string;
    categoria: string;
    tipo: string;
    valorCOP: number;
    valorUSD: number;
}

interface CohortData {
    cohort: string;
    totalUsers: number;
    retention: number[];
    retentionPct: number[];
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

interface SubscriberHistory {
    month: string;
    activeSubscribers: number;
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

// ─── Constants ────────────────────────────────────────
const MONTHS_ES: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

const COHORT_COLORS = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
    '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#10B981', '#06B6D4', '#3B82F6', '#64748B',
];

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

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
};

// ─── Helpers ──────────────────────────────────────────
function parseDate(dateStr: string): Date {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
}

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${MONTHS_ES[month] || month} ${year?.slice(2) || ''}`;
}

// ─── Page Component ───────────────────────────────────
export default function KeyMetricsPage() {
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'USD' | 'COP'>('USD');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [cohortAnalysis, setCohortAnalysis] = useState<CohortData[]>([]);
    const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowth[]>([]);
    const [subscriberHistory, setSubscriberHistory] = useState<SubscriberHistory[]>([]);
    const [arpuMensual, setArpuMensual] = useState<ArpuMensual[]>([]);
    const [trm, setTrm] = useState(4200);
    const [saldoTotal, setSaldoTotal] = useState(0);

    // UI toggles
    const [cohortView, setCohortView] = useState<'pct' | 'abs' | 'new'>('pct');
    const [heatmapFull, setHeatmapFull] = useState(false);
    const [includeApiCosts, setIncludeApiCosts] = useState(true);

    // ─── Data Fetching ────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const [txRes, subsRes, arpuRes] = await Promise.all([
                fetch('/api/transactions?all=true'),
                fetch(`/api/subscriptions?currency=${currency}`),
                fetch('/api/arpu'),
            ]);

            const txData = await txRes.json();
            if (txData.success !== false) {
                setTransactions(txData.transactions || []);
                setSaldoTotal(currency === 'COP' ? txData.summary?.saldoTotalCOP : txData.summary?.saldoTotalUSD);
            }

            const subsData = await subsRes.json();
            if (subsData.success !== false) {
                setCohortAnalysis(subsData.cohortAnalysis || []);
                setMonthlyGrowth(subsData.monthlyGrowth || []);
                setSubscriberHistory(subsData.subscriberHistory || []);
            }

            const arpuData = await arpuRes.json();
            if (arpuData.success !== false) {
                setArpuMensual(arpuData.arpuMensual || []);
                setTrm(arpuData.trm || 4200);
            }
        } catch (err) {
            console.error('Error fetching key metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [currency]);

    // ─── Formatters ───────────────────────────────────
    const formatCurrency = (value: number) => {
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
        }
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    };

    const formatCurrencyCompact = (value: number) => {
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (currency === 'COP') {
            if (abs >= 1000000000) return `${sign}$${(abs / 1000000000).toFixed(1)}B`;
            if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
            if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
        } else {
            if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
            if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value);
    };

    // ═══════════════════════════════════════════════════
    // 1. BURN RATE
    // ═══════════════════════════════════════════════════
    const burnData = useMemo(() => {
        const valueKey: keyof Transaction = currency === 'COP' ? 'valorCOP' : 'valorUSD';
        const byMonth: Record<string, { ingresos: number; egresos: number }> = {};

        transactions.forEach(tx => {
            const date = parseDate(tx.fecha);
            if (date.getFullYear() < 2024) return;
            const mk = getMonthKey(date);
            if (!byMonth[mk]) byMonth[mk] = { ingresos: 0, egresos: 0 };

            if (tx.naturaleza === 'INGRESO' && tx.clasificacion !== 'APORTE CAPITAL') {
                byMonth[mk].ingresos += Math.abs(tx[valueKey] as number);
            } else if (tx.naturaleza === 'EGRESO') {
                byMonth[mk].egresos += Math.abs(tx[valueKey] as number);
            }
        });

        return Object.entries(byMonth)
            .map(([mes, d]) => ({
                mes,
                mesLabel: formatMonth(mes),
                grossBurn: d.egresos,
                netBurn: d.egresos - d.ingresos,
                ingresos: d.ingresos,
            }))
            .sort((a, b) => a.mes.localeCompare(b.mes))
            .slice(-12);
    }, [transactions, currency]);

    const lastBurn = burnData.length > 0 ? burnData[burnData.length - 1] : null;
    const prevBurn = burnData.length > 1 ? burnData[burnData.length - 2] : null;

    const burnTrend = useMemo(() => {
        if (!prevBurn || !lastBurn || prevBurn.netBurn === 0) return 0;
        return ((lastBurn.netBurn - prevBurn.netBurn) / Math.abs(prevBurn.netBurn)) * 100;
    }, [lastBurn, prevBurn]);

    // ═══════════════════════════════════════════════════
    // 2. RUNWAY
    // ═══════════════════════════════════════════════════
    const runway = useMemo(() => {
        const recentPositiveBurns = burnData.filter(d => d.netBurn > 0).slice(-3);
        const avgNetBurn = recentPositiveBurns.length > 0
            ? recentPositiveBurns.reduce((s, b) => s + b.netBurn, 0) / recentPositiveBurns.length
            : 0;
        const caja = Math.abs(saldoTotal);
        const months = avgNetBurn > 0 ? caja / avgNetBurn : 99;
        return { caja, avgNetBurn, months };
    }, [burnData, saldoTotal]);

    const runwayColor = runway.months >= 12 ? 'emerald' : runway.months >= 6 ? 'amber' : 'red';

    // ═══════════════════════════════════════════════════
    // 3. COHORT RETENTION
    // ═══════════════════════════════════════════════════
    const maxCohortMonths = useMemo(() => {
        return Math.max(...cohortAnalysis.map(c => c.retentionPct.length), 0);
    }, [cohortAnalysis]);

    const cohortCurves = useMemo(() => {
        if (cohortAnalysis.length === 0) return [];
        return cohortAnalysis.map((c, i) => ({
            name: formatMonth(c.cohort),
            key: c.cohort,
            data: c.retentionPct.map((pct, monthIdx) => ({
                month: `+${monthIdx}`,
                pct,
            })),
            color: COHORT_COLORS[i % COHORT_COLORS.length],
        }));
    }, [cohortAnalysis]);

    // ═══════════════════════════════════════════════════
    // 4. NET DOLLAR RETENTION
    // ═══════════════════════════════════════════════════
    const ndrData = useMemo(() => {
        if (subscriberHistory.length < 2) return [];
        return subscriberHistory.slice(1).map((h, idx) => {
            const prev = subscriberHistory[idx];
            const ndr = prev.mrr > 0 ? (h.mrr / prev.mrr) * 100 : 100;
            return {
                month: h.month,
                monthLabel: formatMonth(h.month),
                mrr: h.mrr,
                mrrPrev: prev.mrr,
                ndr: Math.round(ndr * 10) / 10,
            };
        });
    }, [subscriberHistory]);

    const latestNdr = ndrData.length > 0 ? ndrData[ndrData.length - 1] : null;

    // ═══════════════════════════════════════════════════
    // 5. GROSS MARGIN & COGS
    // ═══════════════════════════════════════════════════
    const grossMarginData = useMemo(() => {
        const valueKey: keyof Transaction = currency === 'COP' ? 'valorCOP' : 'valorUSD';
        const cogsByMonth: Record<string, number> = {};

        transactions.forEach(tx => {
            const date = parseDate(tx.fecha);
            if (date.getFullYear() < 2024) return;
            const mk = getMonthKey(date);

            if (tx.tipo !== 'COSTOS VARIABLES') return;

            if (!includeApiCosts) {
                const clasif = (tx.clasificacion || '').toUpperCase();
                if (clasif.includes('API') || clasif.includes('CRÉDITO') || clasif.includes('CREDITO') || clasif.includes('PLATAFORMAS TECNOLÓGICAS') || clasif.includes('PLATAFORMAS TECNOLOGICAS')) {
                    return;
                }
            }

            cogsByMonth[mk] = (cogsByMonth[mk] || 0) + Math.abs(tx[valueKey] as number);
        });

        return arpuMensual.map(a => {
            const rev = currency === 'COP' ? a.revenueCOP : a.revenue;
            const cogs = cogsByMonth[a.mes] || 0;
            const grossProfit = rev - cogs;
            const grossMarginPct = rev > 0 ? (grossProfit / rev) * 100 : 0;
            return {
                mes: a.mes,
                mesLabel: a.mesLabel,
                revenue: rev,
                cogs,
                grossProfit,
                grossMarginPct: Math.round(grossMarginPct * 10) / 10,
            };
        });
    }, [arpuMensual, transactions, currency, includeApiCosts]);

    const latestMargin = grossMarginData.length > 0 ? grossMarginData[grossMarginData.length - 1] : null;

    // ═══════════════════════════════════════════════════
    // 6. OPEX DISTRIBUTION
    // ═══════════════════════════════════════════════════
    const opexData = useMemo(() => {
        const valueKey: keyof Transaction = currency === 'COP' ? 'valorCOP' : 'valorUSD';
        const byTipo: Record<string, number> = {};
        let total = 0;

        transactions.forEach(tx => {
            if (tx.naturaleza !== 'EGRESO') return;
            const date = parseDate(tx.fecha);
            if (date.getFullYear() < 2024) return;

            const tipo = tx.tipo || 'OTROS';
            const val = Math.abs(tx[valueKey] as number);
            byTipo[tipo] = (byTipo[tipo] || 0) + val;
            total += val;
        });

        return Object.entries(byTipo)
            .map(([tipo, value]) => ({
                tipo,
                value,
                pct: total > 0 ? (value / total) * 100 : 0,
            }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, currency]);

    const opexTotal = opexData.reduce((s, d) => s + d.value, 0);

    // ─── Heatmap Colors ───────────────────────────────
    const getRetentionColor = (pct: number, isLastDiagonal: boolean): string => {
        if (!heatmapFull && !isLastDiagonal) return 'bg-gray-100 text-gray-500';

        if (pct >= 80) return 'bg-emerald-200 text-emerald-900';
        if (pct >= 60) return 'bg-emerald-100 text-emerald-800';
        if (pct >= 40) return 'bg-amber-100 text-amber-800';
        if (pct >= 20) return 'bg-orange-200 text-orange-800';
        return 'bg-rose-200 text-rose-800';
    };

    // ─── Custom Tooltips (suscriptores style) ─────────
    const BurnTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1.5">{label}</p>
                <div className="space-y-1">
                    <p className="text-sm">Gross Burn: <span className="font-semibold text-red-400">{formatCurrency(d?.grossBurn || 0)}</span></p>
                    <p className="text-sm">Net Burn: <span className={`font-semibold ${(d?.netBurn || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(d?.netBurn || 0)}</span></p>
                    <p className="text-sm text-gray-400">Revenue: {formatCurrency(d?.ingresos || 0)}</p>
                </div>
            </div>
        );
    };

    const NdrTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1.5">{label}</p>
                <p className="text-sm">MRR: <span className="font-semibold">{formatCurrency(d?.mrr || 0)}</span></p>
                <p className="text-sm">NDR: <span className={`font-semibold ${(d?.ndr || 0) >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>{d?.ndr}%</span></p>
            </div>
        );
    };

    const MarginTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1.5">{label}</p>
                <p className="text-sm">Revenue: {formatCurrency(d?.revenue || 0)}</p>
                <p className="text-sm">COGS: <span className="text-red-400">{formatCurrency(d?.cogs || 0)}</span></p>
                <p className="text-sm">Gross Margin: <span className="font-semibold text-emerald-400">{d?.grossMarginPct}%</span></p>
            </div>
        );
    };

    // ─── Loading ──────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando Key Metrics...
                </div>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50" style={{ minWidth: '1024px' }}>
            {/* Header (suscriptores style) */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-semibold text-gray-900">Key Metrics</h1>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">FLUXI</span>
                        </div>
                        <p className="text-sm text-gray-500">Revenue metrics & unit economics</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >USD</button>
                            <button
                                onClick={() => setCurrency('COP')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'COP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >COP</button>
                        </div>
                        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="p-8 space-y-6">

                {/* ── KPI Row (4 cards, suscriptores pattern) ── */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-50 rounded-lg"><Flame className="w-5 h-5 text-red-600" /></div>
                            <span className="text-sm text-gray-500">Gross Burn</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{lastBurn ? formatCurrencyCompact(lastBurn.grossBurn) : '-'}</p>
                        <p className="text-xs text-gray-400 mt-1">{lastBurn?.mesLabel || '-'}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${(lastBurn?.netBurn || 0) > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                <TrendingDown className={`w-5 h-5 ${(lastBurn?.netBurn || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                            </div>
                            <span className="text-sm text-gray-500">Net Burn</span>
                        </div>
                        <p className={`text-2xl font-bold ${(lastBurn?.netBurn || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {lastBurn ? formatCurrencyCompact(lastBurn.netBurn) : '-'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{(lastBurn?.netBurn || 0) > 0 ? 'Quemando caja' : 'Generando caja'}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                            <span className="text-sm text-gray-500">Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">{lastBurn ? formatCurrencyCompact(lastBurn.ingresos) : '-'}</p>
                        <p className="text-xs text-gray-400 mt-1">{lastBurn?.mesLabel || '-'}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${runwayColor === 'emerald' ? 'bg-emerald-50' : runwayColor === 'amber' ? 'bg-amber-50' : 'bg-red-50'}`}>
                                <Clock className={`w-5 h-5 ${runwayColor === 'emerald' ? 'text-emerald-600' : runwayColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`} />
                            </div>
                            <span className="text-sm text-gray-500">Runway</span>
                        </div>
                        <p className={`text-2xl font-bold ${runwayColor === 'emerald' ? 'text-emerald-600' : runwayColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>
                            {runway.months >= 99 ? '> 24' : runway.months.toFixed(1)} meses
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Caja: {formatCurrencyCompact(runway.caja)}</p>
                    </div>
                </div>

                {/* ── Burn Rate Chart + Runway Detail ── */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-gray-900">Burn Rate Mensual</h2>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Gross Burn = total egresos | Net Burn = egresos − ingresos
                                    </div>
                                </div>
                            </div>
                            {prevBurn && lastBurn && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${burnTrend < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {burnTrend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                    {burnTrend < 0 ? 'Bajando' : 'Subiendo'} {Math.abs(burnTrend).toFixed(0)}%
                                </div>
                            )}
                        </div>
                        <div className="h-64">
                            {burnData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={burnData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                        <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} tickFormatter={(v) => formatCurrencyCompact(v)} dx={-10} />
                                        <Tooltip content={<BurnTooltip />} />
                                        <Bar dataKey="grossBurn" fill="#FECACA" radius={[4, 4, 0, 0]} barSize={36} />
                                        <Line type="monotone" dataKey="netBurn" stroke={COLORS.danger} strokeWidth={2.5} dot={{ fill: COLORS.danger, r: 4, strokeWidth: 0 }} activeDot={{ fill: COLORS.danger, strokeWidth: 2, stroke: '#fff', r: 6 }} />
                                        <ReferenceLine y={0} stroke="#D1D5DB" strokeDasharray="4 4" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-4 h-3 bg-red-200 rounded"></div><span>Gross Burn (gastos)</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500 rounded"></div><span>Net Burn (gastos − ingresos)</span></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                        <h2 className="text-base font-semibold text-gray-900 mb-6">Runway Proyectado</h2>
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${runwayColor === 'emerald' ? 'bg-emerald-50 ring-4 ring-emerald-100' : runwayColor === 'amber' ? 'bg-amber-50 ring-4 ring-amber-100' : 'bg-red-50 ring-4 ring-red-100'}`}>
                                <div className="text-center">
                                    <p className={`text-4xl font-bold ${runwayColor === 'emerald' ? 'text-emerald-600' : runwayColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>
                                        {runway.months >= 99 ? '∞' : Math.floor(runway.months)}
                                    </p>
                                    <p className="text-xs text-gray-400 font-medium uppercase">meses</p>
                                </div>
                            </div>
                            <div className="w-full mb-6">
                                <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>0</span><span>24 meses</span></div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className={`h-2.5 rounded-full transition-all duration-700 ${runwayColor === 'emerald' ? 'bg-emerald-500' : runwayColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min((runway.months / 24) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs text-gray-500 font-medium">Caja disponible</span>
                                    <span className="text-sm font-bold text-gray-900">{formatCurrencyCompact(runway.caja)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-4 h-4 text-red-400" />
                                        <span className="text-xs text-gray-500 font-medium">Net Burn Avg (3m)</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{formatCurrencyCompact(runway.avgNetBurn)}/m</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-100 italic">* Basado en meses con Net Burn positivo (últimos 3).</p>
                    </div>
                </div>

                {/* ── Cohort Retention Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-gray-900">Análisis de Cohortes — Retención</h2>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Cada fila = mes de registro (cohorte). Columnas = meses de vida.
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => setCohortView('pct')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === 'pct' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Percent className="w-3 h-3" /> Porcentaje
                                    </button>
                                    <button onClick={() => setCohortView('abs')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === 'abs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Hash className="w-3 h-3" /> Absolutos
                                    </button>
                                    <button onClick={() => setCohortView('new')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Users className="w-3 h-3" /> Nuevos
                                    </button>
                                </div>
                                <button onClick={() => setHeatmapFull(!heatmapFull)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${heatmapFull ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}>
                                    <LayoutGrid className="w-3.5 h-3.5" /> Heatmap
                                </button>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <span className="text-gray-400 mr-1">Retención:</span>
                                    <div className="w-5 h-3.5 bg-rose-200 rounded"></div>
                                    <div className="w-5 h-3.5 bg-orange-200 rounded"></div>
                                    <div className="w-5 h-3.5 bg-amber-100 rounded"></div>
                                    <div className="w-5 h-3.5 bg-emerald-100 rounded"></div>
                                    <div className="w-5 h-3.5 bg-emerald-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {cohortAnalysis.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 font-medium text-gray-500 bg-gray-50/50 sticky left-0 z-10">Cohorte</th>
                                        <th className="text-center py-3 px-3 font-medium text-gray-500 bg-gray-50/50">Nuevos</th>
                                        {[...Array(maxCohortMonths)].map((_, i) => (
                                            <th key={i} className="text-center py-3 px-2 font-medium text-gray-500 bg-gray-50/50 min-w-[56px]">M{i}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cohortAnalysis.map((cohort, rowIdx) => (
                                        <tr key={cohort.cohort} className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-50/70 transition-colors`}>
                                            <td className="py-2.5 px-4 font-medium text-gray-900 sticky left-0 z-10 bg-inherit whitespace-nowrap">{formatMonth(cohort.cohort)}</td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-indigo-600 bg-gray-50/50">{cohort.totalUsers}</td>
                                            {[...Array(maxCohortMonths)].map((_, colIdx) => {
                                                const pct = cohort.retentionPct[colIdx];
                                                const abs = cohort.retention[colIdx];
                                                if (pct === undefined) return <td key={colIdx} className="py-2 px-1"><div className="w-full h-10 bg-gray-50/30 rounded-lg"></div></td>;

                                                const isLastDiagonal = colIdx === cohort.retentionPct.length - 1;
                                                let displayValue: string;
                                                if (cohortView === 'pct') displayValue = `${pct}%`;
                                                else if (cohortView === 'abs') displayValue = `${abs}`;
                                                else displayValue = colIdx === 0 ? `${cohort.totalUsers}` : `${abs}/${cohort.totalUsers}`;

                                                return (
                                                    <td key={colIdx} className="py-2 px-1">
                                                        <div className={`w-full h-10 flex items-center justify-center text-xs font-semibold rounded-lg transition-all hover:scale-105 cursor-default ${getRetentionColor(pct, isLastDiagonal)}`} title={`${abs} de ${cohort.totalUsers} activos (${pct}%)`}>
                                                            {displayValue}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">No hay datos de cohortes</div>
                    )}
                </div>

                {/* ── Cohort Curves ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <h2 className="text-base font-semibold text-gray-900">Curvas de Retención por Cohorte</h2>
                        <div className="group relative">
                            <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Si las cohortes recientes están por encima, la retención está mejorando.
                            </div>
                        </div>
                    </div>
                    <div className="h-72">
                        {cohortCurves.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.gridLine} />
                                    <XAxis dataKey="month" type="category" allowDuplicatedCategory={false} axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} dx={-10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }} formatter={(val: number | undefined) => [`${(val ?? 0).toFixed(1)}%`, 'Retención']} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                                    {cohortCurves.map((curve) => (
                                        <Line key={curve.key} data={curve.data} name={curve.name} dataKey="pct" stroke={curve.color} strokeWidth={2} dot={{ r: 3, fill: curve.color, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                        )}
                    </div>
                </div>

                {/* ── NDR + Gross Margin ── */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-gray-900">Net Dollar Retention</h2>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        NDR = MRR fin / MRR inicio × 100. Meta: &gt;100%
                                    </div>
                                </div>
                            </div>
                            {latestNdr && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${latestNdr.ndr >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    <span className="font-bold">{latestNdr.ndr}%</span>
                                </div>
                            )}
                        </div>
                        <div className="h-64">
                            {ndrData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={ndrData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                        <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} dy={10} />
                                        <YAxis yAxisId="mrr" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(v)} dx={-10} />
                                        <YAxis yAxisId="ndr" orientation="right" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 200]} />
                                        <Tooltip content={<NdrTooltip />} />
                                        <Bar yAxisId="mrr" dataKey="mrr" fill="#C7D2FE" radius={[4, 4, 0, 0]} barSize={28} />
                                        <Line yAxisId="ndr" type="monotone" dataKey="ndr" stroke={COLORS.primary} strokeWidth={2.5} dot={{ fill: COLORS.primary, r: 4, strokeWidth: 0 }} activeDot={{ fill: COLORS.primary, strokeWidth: 2, stroke: '#fff', r: 6 }} />
                                        <ReferenceLine yAxisId="ndr" y={100} stroke={COLORS.success} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: '100%', position: 'right', fill: COLORS.success, fontSize: 11, fontWeight: 'bold' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-4 h-3 bg-indigo-200 rounded"></div><span>MRR mensual</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-indigo-500 rounded"></div><span>NDR %</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981, #10B981 4px, transparent 4px, transparent 8px)' }}></div><span>Benchmark 100%</span></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-gray-900">Gross Margin</h2>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        (Revenue − COGS) / Revenue. Benchmark SaaS: ≥60%
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center cursor-pointer gap-2">
                                    <span className="text-xs text-gray-400 font-medium">Costos API</span>
                                    <div className="relative">
                                        <input type="checkbox" checked={includeApiCosts} onChange={() => setIncludeApiCosts(!includeApiCosts)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </label>
                                {latestMargin && (
                                    <span className={`text-sm font-bold ${latestMargin.grossMarginPct >= 60 ? 'text-emerald-600' : latestMargin.grossMarginPct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{latestMargin.grossMarginPct}%</span>
                                )}
                            </div>
                        </div>
                        <div className="h-64">
                            {grossMarginData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={grossMarginData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                        <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} dx={-10} />
                                        <Tooltip content={<MarginTooltip />} />
                                        <ReferenceLine y={60} stroke={COLORS.success} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: '60%', position: 'right', fill: COLORS.success, fontSize: 11, fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="grossMarginPct" stroke={COLORS.success} strokeWidth={2.5} fillOpacity={1} fill="url(#marginGrad)" dot={{ fill: COLORS.success, r: 4, strokeWidth: 0 }} activeDot={{ fill: COLORS.success, strokeWidth: 2, stroke: '#fff', r: 6 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500 rounded"></div><span>Gross Margin %</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981, #10B981 4px, transparent 4px, transparent 8px)' }}></div><span>Benchmark SaaS 60%</span></div>
                        </div>
                    </div>
                </div>

                {/* ── OPEX Distribution ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">Distribución de Gastos (OPEX)</h2>
                            <span className="text-sm font-medium text-gray-500">Total: {formatCurrencyCompact(opexTotal)}</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-8 items-center">
                            <div className="h-72 relative">
                                {opexData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={opexData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={6} dataKey="value" nameKey="tipo">
                                                {opexData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (<div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>)}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">OPEX</p>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrencyCompact(opexTotal)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {opexData.map((item, idx) => (
                                    <div key={item.tipo} className="p-3 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">{item.tipo}</p>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">{formatCurrencyCompact(item.value)}</p>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                        </div>
                                        <p className="text-right text-[10px] text-gray-400 mt-1.5 font-medium">{item.pct.toFixed(1)}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}