"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
    ChevronDown,
    ChevronRight,
    Banknote,
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

interface Transaction { banco: string; fecha: string; descripcion: string; naturaleza: string; clasificacion: string; categoria: string; tipo: string; valorCOP: number; valorUSD: number; }
interface CohortData { cohort: string; totalUsers: number; retention: number[]; retentionPct: number[]; }
interface MonthlyGrowth { month: string; nuevos: number; cancelaciones: number; neto: number; mrrGain: number; mrrLoss: number; churnRate: number; activosInicio: number; activosFin: number; }
interface SubscriberHistory { month: string; activeSubscribers: number; mrr: number; }
interface ArpuMensual { mes: string; mesLabel: string; pagos: number; revenue: number; revenueCOP: number; arpu: number; arpuCOP: number; }
interface ArpuResponse { success: boolean; trm: number; arpuMesActual: number; arpuMesActualCOP: number; mrrActual: number; mrrActualCOP: number; resumen: { totalRevenue: number; totalRevenueCOP: number; totalPagos: number; arpuGlobal: number; arpuGlobalCOP: number; mesesConDatos: number; }; arpuMensual: ArpuMensual[]; }

const MONTHS_ES: Record<string, string> = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };
const COHORT_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#10B981', '#06B6D4', '#3B82F6', '#64748B'];
const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E', '#14B8A6'];
const COLORS = { primary: '#6366F1', success: '#10B981', danger: '#EF4444', dangerLight: '#F87171', warning: '#F59E0B', grayLight: '#9CA3AF', gridLine: '#F3F4F6' };

function parseDate(s: string): Date { if (!s) return new Date(0); const p = s.split('/'); if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])); return new Date(s); }
function getMonthKey(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function formatMonth(m: string): string { if (!m) return ''; const [y, mo] = m.split('-'); return `${MONTHS_ES[mo] || mo} ${y?.slice(2) || ''}`; }

export default function KeyMetricsPage() {
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'USD' | 'COP'>('USD');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [cohortAnalysis, setCohortAnalysis] = useState<CohortData[]>([]);
    const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowth[]>([]);
    const [subscriberHistory, setSubscriberHistory] = useState<SubscriberHistory[]>([]);
    const [arpuData, setArpuData] = useState<ArpuResponse | null>(null);
    const [saldoTotal, setSaldoTotal] = useState(0);
    const [cohortView, setCohortView] = useState<'pct' | 'abs' | 'mrr'>('pct');
    const [heatmapFull, setHeatmapFull] = useState(false);
    const [includeApiCosts, setIncludeApiCosts] = useState(true);
    const [expandedOpex, setExpandedOpex] = useState<Record<string, boolean>>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const [txRes, subsRes, arpuRes] = await Promise.all([fetch('/api/transactions?all=true'), fetch(`/api/subscriptions?currency=${currency}`), fetch('/api/arpu')]);
            const txData = await txRes.json();
            if (txData.success !== false) { setTransactions(txData.transactions || []); setSaldoTotal(currency === 'COP' ? txData.summary?.saldoTotalCOP : txData.summary?.saldoTotalUSD); }
            const subsData = await subsRes.json();
            if (subsData.success !== false) { setCohortAnalysis(subsData.cohortAnalysis || []); setMonthlyGrowth(subsData.monthlyGrowth || []); setSubscriberHistory(subsData.subscriberHistory || []); }
            const arpuResult = await arpuRes.json();
            if (arpuResult.success !== false) { setArpuData(arpuResult); }
        } catch (err) { console.error('Error fetching key metrics:', err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [currency]);

    const arpuGlobal = useMemo(() => { if (!arpuData) return 0; return currency === 'COP' ? (arpuData.resumen?.arpuGlobalCOP || 0) : (arpuData.resumen?.arpuGlobal || 0); }, [arpuData, currency]);
    const arpuMensual = useMemo(() => arpuData?.arpuMensual || [], [arpuData]);
    const isMonthSelected = selectedMonth !== 'all';

    const formatCurrency = useCallback((v: number) => {
        if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    }, [currency]);

    const formatCompact = useCallback((v: number) => {
        const a = Math.abs(v), s = v < 0 ? '-' : '';
        if (currency === 'COP') { if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`; if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`; if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`; }
        else { if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`; if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`; }
        return formatCurrency(v);
    }, [currency, formatCurrency]);

    // BURN RATE (Revenue = clasificacion VENTAS only)
    const burnData = useMemo(() => {
        const vk: keyof Transaction = currency === 'COP' ? 'valorCOP' : 'valorUSD';
        const bm: Record<string, { ventas: number; egresos: number }> = {};
        transactions.forEach(tx => {
            const d = parseDate(tx.fecha); if (d.getFullYear() < 2024) return;
            const mk = getMonthKey(d); if (!bm[mk]) bm[mk] = { ventas: 0, egresos: 0 };
            if ((tx.clasificacion || '').toUpperCase() === 'VENTAS') bm[mk].ventas += Math.abs(tx[vk] as number);
            else if (tx.naturaleza === 'EGRESO') bm[mk].egresos += Math.abs(tx[vk] as number);
        });
        return Object.entries(bm).map(([m, d]) => ({ mes: m, mesLabel: formatMonth(m), grossBurn: d.egresos, netBurn: d.egresos - d.ventas, revenue: d.ventas })).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
    }, [transactions, currency]);

    const availableMonths = useMemo(() => [...burnData].reverse().map(d => ({ value: d.mes, label: d.mesLabel })), [burnData]);

    // KPIs: all_time=TOTALS, specific month=that month
    const kpiValues = useMemo(() => {
        if (isMonthSelected) {
            const md = burnData.find(d => d.mes === selectedMonth);
            return { revenue: md?.revenue || 0, grossBurn: md?.grossBurn || 0, netBurn: md?.netBurn || 0, label: md?.mesLabel || selectedMonth };
        }
        const t = burnData.reduce((a, d) => ({ revenue: a.revenue + d.revenue, grossBurn: a.grossBurn + d.grossBurn, netBurn: a.netBurn + d.netBurn }), { revenue: 0, grossBurn: 0, netBurn: 0 });
        return { ...t, label: 'Todo el tiempo' };
    }, [burnData, selectedMonth, isMonthSelected]);

    const burnTrend = useMemo(() => {
        const l = burnData[burnData.length - 1], p = burnData.length > 1 ? burnData[burnData.length - 2] : null;
        if (!p || !l || p.netBurn === 0) return 0;
        return ((l.netBurn - p.netBurn) / Math.abs(p.netBurn)) * 100;
    }, [burnData]);

    // RUNWAY (always fixed, last completed month)
    const runway = useMemo(() => {
        const caja = Math.abs(saldoTotal);
        const cm = burnData.slice(0, -1);
        const lb = cm.length > 0 ? cm[cm.length - 1].netBurn : (burnData[burnData.length - 1]?.netBurn || 0);
        const months = lb > 0 ? caja / lb : 99;
        return { caja, lastCompletedNetBurn: lb, months };
    }, [burnData, saldoTotal]);
    const runwayColor = runway.months >= 12 ? 'emerald' : runway.months >= 6 ? 'amber' : 'red';

    // COHORT RETENTION
    const filteredCohorts = useMemo(() => { if (!isMonthSelected) return cohortAnalysis; return cohortAnalysis.filter(c => c.cohort <= selectedMonth); }, [cohortAnalysis, selectedMonth, isMonthSelected]);
    const maxCohortMonths = useMemo(() => Math.max(...filteredCohorts.map(c => c.retentionPct.length), 0), [filteredCohorts]);

    // Cohort curves: UNIFIED data format => chronological legend
    const cohortCurvesData = useMemo(() => {
        if (filteredCohorts.length === 0) return { data: [] as Record<string, any>[], keys: [] as string[] };
        const sorted = [...filteredCohorts].sort((a, b) => a.cohort.localeCompare(b.cohort));
        const maxLen = Math.max(...sorted.map(c => c.retentionPct.length));
        const data: Record<string, any>[] = [];
        for (let i = 0; i < maxLen; i++) {
            const pt: Record<string, any> = { month: `+${i}` };
            sorted.forEach(c => { if (i < c.retentionPct.length) pt[c.cohort] = c.retentionPct[i]; });
            data.push(pt);
        }
        return { data, keys: sorted.map(c => c.cohort) };
    }, [filteredCohorts]);

    // NDR (using arpuMensual revenue from Stripe)
    const ndrData = useMemo(() => {
        if (arpuMensual.length < 2) return [];
        return arpuMensual.slice(1).map((a, i) => {
            const prev = arpuMensual[i];
            const cr = currency === 'COP' ? a.revenueCOP : a.revenue;
            const pr = currency === 'COP' ? prev.revenueCOP : prev.revenue;
            const ndr = pr > 0 ? (cr / pr) * 100 : 100;
            return { month: a.mes, monthLabel: a.mesLabel, mrr: cr, ndr: Math.round(ndr * 10) / 10 };
        });
    }, [arpuMensual, currency]);
    const latestNdr = ndrData.length > 0 ? ndrData[ndrData.length - 1] : null;

    // GROSS MARGIN
    const grossMarginData = useMemo(() => {
        const vk: keyof Transaction = currency === 'COP' ? 'valorCOP' : 'valorUSD';
        const cbm: Record<string, number> = {};
        transactions.forEach(tx => {
            const d = parseDate(tx.fecha); if (d.getFullYear() < 2024) return;
            if (tx.tipo !== 'COSTOS VARIABLES') return;
            if (!includeApiCosts) { const cl = (tx.clasificacion || '').toUpperCase(); if (cl.includes('API') || cl.includes('CRÉDITO') || cl.includes('CREDITO') || cl.includes('PLATAFORMAS TECNOLÓGICAS') || cl.includes('PLATAFORMAS TECNOLOGICAS')) return; }
            const mk = getMonthKey(d); cbm[mk] = (cbm[mk] || 0) + Math.abs(tx[vk] as number);
        });
        return arpuMensual.map(a => {
            const rev = currency === 'COP' ? a.revenueCOP : a.revenue;
            const cogs = cbm[a.mes] || 0;
            const pct = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;
            return { mes: a.mes, mesLabel: a.mesLabel, revenue: rev, cogs, grossMarginPct: Math.round(pct * 10) / 10 };
        });
    }, [arpuMensual, transactions, currency, includeApiCosts]);
    const latestMargin = grossMarginData.length > 0 ? grossMarginData[grossMarginData.length - 1] : null;

    // OPEX (filtered by month)
    const opexData = useMemo(() => {
        const vk: keyof Transaction = currency === 'COP' ? 'valorCOP' : 'valorUSD';
        const st: Record<string, { total: number; clasificaciones: Record<string, number> }> = {};
        let total = 0;
        transactions.forEach(tx => {
            if (tx.naturaleza !== 'EGRESO') return;
            const d = parseDate(tx.fecha); if (d.getFullYear() < 2024) return;
            if (isMonthSelected && getMonthKey(d) !== selectedMonth) return;
            const tipo = tx.tipo || 'OTROS', clasif = tx.clasificacion || 'SIN CLASIFICAR', val = Math.abs(tx[vk] as number);
            if (!st[tipo]) st[tipo] = { total: 0, clasificaciones: {} };
            st[tipo].total += val; st[tipo].clasificaciones[clasif] = (st[tipo].clasificaciones[clasif] || 0) + val; total += val;
        });
        return { total, items: Object.entries(st).map(([tipo, data]) => ({ tipo, value: data.total, pct: total > 0 ? (data.total / total) * 100 : 0, clasificaciones: Object.entries(data.clasificaciones).map(([n, v]) => ({ name: n, value: v, pct: data.total > 0 ? (v / data.total) * 100 : 0 })).sort((a, b) => b.value - a.value) })).sort((a, b) => b.value - a.value) };
    }, [transactions, currency, selectedMonth, isMonthSelected]);

    // Selected month label for reference lines on time series
    const selectedMonthLabel = useMemo(() => isMonthSelected ? formatMonth(selectedMonth) : null, [selectedMonth, isMonthSelected]);

    const getRetentionColor = (pct: number, isLast: boolean): string => {
        if (!heatmapFull && !isLast) return 'bg-gray-100 text-gray-500';
        if (pct >= 80) return 'bg-emerald-200 text-emerald-900';
        if (pct >= 60) return 'bg-emerald-100 text-emerald-800';
        if (pct >= 40) return 'bg-amber-100 text-amber-800';
        if (pct >= 20) return 'bg-orange-200 text-orange-800';
        return 'bg-rose-200 text-rose-800';
    };

    const BurnTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null; const d = payload[0]?.payload;
        return (<div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700"><p className="text-gray-400 text-xs mb-1.5">{label}</p><div className="space-y-1"><p className="text-sm">Revenue: <span className="font-semibold text-emerald-400">{formatCurrency(d?.revenue || 0)}</span></p><p className="text-sm">Gross Burn: <span className="font-semibold text-red-400">{formatCurrency(d?.grossBurn || 0)}</span></p><p className="text-sm">Net Burn: <span className={`font-semibold ${(d?.netBurn || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(d?.netBurn || 0)}</span></p></div></div>);
    };
    const NdrTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null; const d = payload[0]?.payload;
        return (<div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700"><p className="text-gray-400 text-xs mb-1.5">{label}</p><p className="text-sm">MRR: <span className="font-semibold">{formatCurrency(d?.mrr || 0)}</span></p><p className="text-sm">NDR: <span className={`font-semibold ${(d?.ndr || 0) >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>{d?.ndr}%</span></p></div>);
    };
    const MarginTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null; const d = payload[0]?.payload;
        return (<div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700"><p className="text-gray-400 text-xs mb-1.5">{label}</p><p className="text-sm">Revenue: {formatCurrency(d?.revenue || 0)}</p><p className="text-sm">COGS: <span className="text-red-400">{formatCurrency(d?.cogs || 0)}</span></p><p className="text-sm">Gross Margin: <span className="font-semibold text-emerald-400">{d?.grossMarginPct}%</span></p></div>);
    };
    const renderPieLabel = ({ pct, midAngle, outerRadius, cx, cy }: any) => {
        if (pct < 3) return null; const R = Math.PI / 180, r = outerRadius + 25, lx = cx + r * Math.cos(-midAngle * R), ly = cy + r * Math.sin(-midAngle * R);
        return <text x={lx} y={ly} fill="#374151" textAnchor={lx > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>{`${pct.toFixed(0)}%`}</text>;
    };

    if (loading) return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="flex items-center gap-3 text-gray-500"><RefreshCw className="w-5 h-5 animate-spin" />Cargando Key Metrics...</div></div>);

    return (
        <div className="min-h-screen bg-gray-50" style={{ minWidth: '1024px' }}>
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
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="all">Todo el tiempo</option>
                            {availableMonths.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                        </select>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setCurrency('USD')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>USD</button>
                            <button onClick={() => setCurrency('COP')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'COP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>COP</button>
                        </div>
                        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                    </div>
                </div>
            </header>

            <div className="p-8 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div><span className="text-sm text-gray-500">Revenue</span></div>
                        <p className="text-2xl font-bold text-emerald-600">{formatCompact(kpiValues.revenue)}</p>
                        <p className="text-xs text-gray-400 mt-1">{kpiValues.label}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-red-50 rounded-lg"><Flame className="w-5 h-5 text-red-600" /></div><span className="text-sm text-gray-500">Gross Burn</span></div>
                        <p className="text-2xl font-bold text-gray-900">{formatCompact(kpiValues.grossBurn)}</p>
                        <p className="text-xs text-gray-400 mt-1">{kpiValues.label}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2"><div className={`p-2 rounded-lg ${kpiValues.netBurn > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}><TrendingDown className={`w-5 h-5 ${kpiValues.netBurn > 0 ? 'text-red-600' : 'text-emerald-600'}`} /></div><span className="text-sm text-gray-500">Net Burn</span></div>
                        <p className={`text-2xl font-bold ${kpiValues.netBurn > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCompact(kpiValues.netBurn)}</p>
                        <p className="text-xs text-gray-400 mt-1">{kpiValues.netBurn > 0 ? 'Quemando caja' : 'Generando caja'}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2"><div className={`p-2 rounded-lg ${runwayColor === 'emerald' ? 'bg-emerald-50' : runwayColor === 'amber' ? 'bg-amber-50' : 'bg-red-50'}`}><Clock className={`w-5 h-5 ${runwayColor === 'emerald' ? 'text-emerald-600' : runwayColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`} /></div><span className="text-sm text-gray-500">Runway</span></div>
                        <p className={`text-2xl font-bold ${runwayColor === 'emerald' ? 'text-emerald-600' : runwayColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>{runway.months >= 99 ? '∞' : runway.months.toFixed(1)} meses</p>
                        <p className="text-xs text-gray-400 mt-1">Caja: {formatCompact(runway.caja)}</p>
                    </div>
                </div>

                {/* COHORT TABLE */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><h2 className="text-base font-semibold text-gray-900">Análisis de Cohortes — Retención</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Cada fila = mes de registro. Columnas = meses de vida.</div></div></div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => setCohortView('pct')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === 'pct' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Percent className="w-3 h-3" /> Porcentaje</button>
                                    <button onClick={() => setCohortView('abs')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === 'abs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Hash className="w-3 h-3" /> Absolutos</button>
                                    <button onClick={() => setCohortView('mrr')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === 'mrr' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Banknote className="w-3 h-3" /> MRR</button>
                                </div>
                                <button onClick={() => setHeatmapFull(!heatmapFull)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${heatmapFull ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}><LayoutGrid className="w-3.5 h-3.5" /> Heatmap</button>
                                <div className="flex items-center gap-1 text-[10px]"><span className="text-gray-400 mr-1">Retención:</span><div className="w-5 h-3.5 bg-rose-200 rounded"></div><div className="w-5 h-3.5 bg-orange-200 rounded"></div><div className="w-5 h-3.5 bg-amber-100 rounded"></div><div className="w-5 h-3.5 bg-emerald-100 rounded"></div><div className="w-5 h-3.5 bg-emerald-200 rounded"></div></div>
                            </div>
                        </div>
                    </div>
                    {filteredCohorts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 bg-gray-50/50 sticky left-0 z-10">Cohorte</th>
                                    <th className="text-center py-3 px-3 font-medium text-gray-500 bg-gray-50/50">Nuevos</th>
                                    {[...Array(maxCohortMonths)].map((_, i) => (<th key={i} className="text-center py-3 px-2 font-medium text-gray-500 bg-gray-50/50 min-w-[64px]">M{i}</th>))}
                                </tr></thead>
                                <tbody>
                                    {filteredCohorts.map((cohort, rowIdx) => (
                                        <tr key={cohort.cohort} className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-50/70 transition-colors`}>
                                            <td className="py-2.5 px-4 font-medium text-gray-900 sticky left-0 z-10 bg-inherit whitespace-nowrap">{formatMonth(cohort.cohort)}</td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-indigo-600 bg-gray-50/50">{cohort.totalUsers}</td>
                                            {[...Array(maxCohortMonths)].map((_, colIdx) => {
                                                const pct = cohort.retentionPct[colIdx], abs = cohort.retention[colIdx];
                                                if (pct === undefined) return <td key={colIdx} className="py-2 px-1"><div className="w-full h-10 bg-gray-50/30 rounded-lg"></div></td>;
                                                const isLast = colIdx === cohort.retentionPct.length - 1;
                                                let dv: string;
                                                if (cohortView === 'pct') dv = `${pct}%`;
                                                else if (cohortView === 'abs') dv = `${abs}`;
                                                else dv = formatCompact(abs * arpuGlobal);
                                                return (<td key={colIdx} className="py-2 px-1"><div className={`w-full h-10 flex items-center justify-center text-xs font-semibold rounded-lg transition-all hover:scale-105 cursor-default ${getRetentionColor(pct, isLast)}`} title={`${abs} de ${cohort.totalUsers} (${pct}%) | MRR: ${formatCompact(abs * arpuGlobal)}`}>{dv}</div></td>);
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (<div className="h-48 flex items-center justify-center text-gray-400">No hay datos de cohortes</div>)}
                </div>

                {/* COHORT CURVES (unified data = chronological legend) */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-4 h-4 text-indigo-600" /><h2 className="text-base font-semibold text-gray-900">Curvas de Retención por Cohorte</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Si las cohortes recientes están por encima, la retención mejora.</div></div></div>
                    <div className="h-72">
                        {cohortCurvesData.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={cohortCurvesData.data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.gridLine} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} dx={-10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }} formatter={(val: number | undefined, name: string | undefined) => [`${(val ?? 0).toFixed(1)}%`, formatMonth(name || '')]} />
                                    <Legend content={({ payload }: any) => { const sorted = [...(payload || [])].sort((a: any, b: any) => (a.dataKey || '').localeCompare(b.dataKey || '')); return (<div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3">{sorted.map((e: any) => (<div key={e.dataKey} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-[11px] text-gray-500">{formatMonth(e.dataKey)}</span></div>))}</div>); }} />
                                    {cohortCurvesData.keys.map((key, idx) => (
                                        <Line key={key} dataKey={key} stroke={COHORT_COLORS[idx % COHORT_COLORS.length]} strokeWidth={2} dot={{ r: 3, fill: COHORT_COLORS[idx % COHORT_COLORS.length], strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>)}
                    </div>
                </div>

                {/* BURN RATE + RUNWAY */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2"><h2 className="text-base font-semibold text-gray-900">Burn Rate Mensual</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Revenue = Ventas | Gross Burn = Egresos | Net Burn = Egresos − Ventas</div></div></div>
                            {burnTrend !== 0 && (<div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${burnTrend < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{burnTrend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}{burnTrend < 0 ? 'Bajando' : 'Subiendo'} {Math.abs(burnTrend).toFixed(0)}%</div>)}
                        </div>
                        <div className="h-64">
                            {burnData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={burnData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                        <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} tickFormatter={(v) => formatCompact(v)} dx={-10} />
                                        <Tooltip content={<BurnTooltip />} />
                                        <Bar dataKey="grossBurn" fill="#FECACA" radius={[4, 4, 0, 0]} barSize={36} />
                                        <Line type="monotone" dataKey="netBurn" stroke={COLORS.danger} strokeWidth={2.5} dot={{ fill: COLORS.danger, r: 4, strokeWidth: 0 }} activeDot={{ fill: COLORS.danger, strokeWidth: 2, stroke: '#fff', r: 6 }} />
                                        <ReferenceLine y={0} stroke="#D1D5DB" strokeDasharray="4 4" />
                                        {selectedMonthLabel && <ReferenceLine x={selectedMonthLabel} stroke={COLORS.primary} strokeDasharray="4 4" strokeWidth={2} label={{ value: '▼', position: 'top', fill: COLORS.primary, fontSize: 14 }} />}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>)}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-4 h-3 bg-red-200 rounded"></div><span>Gross Burn (egresos)</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500 rounded"></div><span>Net Burn (egresos − ventas)</span></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                        <h2 className="text-base font-semibold text-gray-900 mb-6">Runway Proyectado</h2>
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${runwayColor === 'emerald' ? 'bg-emerald-50 ring-4 ring-emerald-100' : runwayColor === 'amber' ? 'bg-amber-50 ring-4 ring-amber-100' : 'bg-red-50 ring-4 ring-red-100'}`}>
                                <div className="text-center">
                                    <p className={`text-4xl font-bold ${runwayColor === 'emerald' ? 'text-emerald-600' : runwayColor === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>{runway.months >= 99 ? '∞' : Math.floor(runway.months)}</p>
                                    <p className="text-xs text-gray-400 font-medium uppercase">meses</p>
                                </div>
                            </div>
                            <div className="w-full mb-6">
                                <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>0</span><span>24 meses</span></div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5"><div className={`h-2.5 rounded-full transition-all duration-700 ${runwayColor === 'emerald' ? 'bg-emerald-500' : runwayColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min((runway.months / 24) * 100, 100)}%` }} /></div>
                            </div>
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500 font-medium">Caja disponible</span><span className="text-sm font-bold text-gray-900">{formatCompact(runway.caja)}</span></div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><Flame className="w-4 h-4 text-red-400" /><span className="text-xs text-gray-500 font-medium">Net Burn (últ. mes)</span></div><span className="text-sm font-bold text-gray-900">{formatCompact(runway.lastCompletedNetBurn)}/m</span></div>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-100 italic">* Basado en el Net Burn del último mes completo.</p>
                    </div>
                </div>

                {/* NDR + GROSS MARGIN */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2"><h2 className="text-base font-semibold text-gray-900">Net Dollar Retention</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">NDR = MRR actual / MRR anterior × 100. Meta: &gt;100%</div></div></div>
                            {latestNdr && (<div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${latestNdr.ndr >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><span className="font-bold">{latestNdr.ndr}%</span></div>)}
                        </div>
                        <div className="h-64">
                            {ndrData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={ndrData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                        <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} dy={10} />
                                        <YAxis yAxisId="mrr" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} dx={-10} />
                                        <YAxis yAxisId="ndr" orientation="right" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 200]} />
                                        <Tooltip content={<NdrTooltip />} />
                                        <Bar yAxisId="mrr" dataKey="mrr" fill="#C7D2FE" radius={[4, 4, 0, 0]} barSize={28} />
                                        <Line yAxisId="ndr" type="monotone" dataKey="ndr" stroke={COLORS.primary} strokeWidth={2.5} dot={{ fill: COLORS.primary, r: 4, strokeWidth: 0 }} activeDot={{ fill: COLORS.primary, strokeWidth: 2, stroke: '#fff', r: 6 }} />
                                        <ReferenceLine yAxisId="ndr" y={100} stroke={COLORS.success} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: '100%', position: 'right', fill: COLORS.success, fontSize: 11, fontWeight: 'bold' }} />
                                        {selectedMonthLabel && <ReferenceLine yAxisId="mrr" x={selectedMonthLabel} stroke={COLORS.primary} strokeDasharray="4 4" strokeWidth={2} label={{ value: '▼', position: 'top', fill: COLORS.primary, fontSize: 14 }} />}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>)}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-4 h-3 bg-indigo-200 rounded"></div><span>MRR (Stripe)</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-indigo-500 rounded"></div><span>NDR %</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981, #10B981 4px, transparent 4px, transparent 8px)' }}></div><span>100%</span></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2"><h2 className="text-base font-semibold text-gray-900">Gross Margin</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">(Revenue − COGS) / Revenue. Benchmark SaaS: ≥60%</div></div></div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center cursor-pointer gap-2"><span className="text-xs text-gray-400 font-medium">Costos API</span><div className="relative"><input type="checkbox" checked={includeApiCosts} onChange={() => setIncludeApiCosts(!includeApiCosts)} className="sr-only peer" /><div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div></div></label>
                                {latestMargin && (<span className={`text-sm font-bold ${latestMargin.grossMarginPct >= 60 ? 'text-emerald-600' : latestMargin.grossMarginPct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{latestMargin.grossMarginPct}%</span>)}
                            </div>
                        </div>
                        <div className="h-64">
                            {grossMarginData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={grossMarginData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs><linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.success} stopOpacity={0.15} /><stop offset="95%" stopColor={COLORS.success} stopOpacity={0} /></linearGradient></defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} vertical={false} />
                                        <XAxis dataKey="mesLabel" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} dx={-10} />
                                        <Tooltip content={<MarginTooltip />} />
                                        <ReferenceLine y={60} stroke={COLORS.success} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: '60%', position: 'right', fill: COLORS.success, fontSize: 11, fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="grossMarginPct" stroke={COLORS.success} strokeWidth={2.5} fillOpacity={1} fill="url(#marginGrad)" dot={{ fill: COLORS.success, r: 4, strokeWidth: 0 }} activeDot={{ fill: COLORS.success, strokeWidth: 2, stroke: '#fff', r: 6 }} />
                                        {selectedMonthLabel && <ReferenceLine x={selectedMonthLabel} stroke={COLORS.primary} strokeDasharray="4 4" strokeWidth={2} label={{ value: '▼', position: 'top', fill: COLORS.primary, fontSize: 14 }} />}
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>)}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500 rounded"></div><span>Gross Margin %</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981, #10B981 4px, transparent 4px, transparent 8px)' }}></div><span>Benchmark 60%</span></div>
                        </div>
                    </div>
                </div>

                {/* OPEX DISTRIBUTION */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center justify-between"><h2 className="text-base font-semibold text-gray-900">Distribución de Gastos (OPEX)</h2><span className="text-sm font-medium text-gray-500">Total: {formatCompact(opexData.total)}</span></div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-5 gap-8 items-start">
                            <div className="col-span-2 h-80 relative">
                                {opexData.items.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={opexData.items} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={4} dataKey="value" nameKey="tipo" label={renderPieLabel} labelLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}>
                                                {opexData.items.map((_, i) => (<Cell key={`c-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                                            </Pie>
                                            <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (<div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>)}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"><p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">OPEX</p><p className="text-lg font-bold text-gray-900">{formatCompact(opexData.total)}</p></div>
                            </div>
                            <div className="col-span-3 space-y-2">
                                {opexData.items.map((item, idx) => {
                                    const isExp = expandedOpex[item.tipo] || false;
                                    return (
                                        <div key={item.tipo} className="border border-gray-100 rounded-xl overflow-hidden">
                                            <button onClick={() => setExpandedOpex(p => ({ ...p, [item.tipo]: !p[item.tipo] }))} className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                    <span className="text-sm font-medium text-gray-700">{item.tipo}</span>
                                                    {isExp ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-24 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${item.pct}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} /></div>
                                                    <span className="text-sm font-bold text-gray-900 w-20 text-right">{formatCompact(item.value)}</span>
                                                    <span className="text-xs text-gray-400 w-12 text-right">{item.pct.toFixed(1)}%</span>
                                                </div>
                                            </button>
                                            {isExp && item.clasificaciones.length > 0 && (
                                                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2">
                                                    {item.clasificaciones.map(c => (
                                                        <div key={c.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                            <span className="text-xs text-gray-600 pl-6">{c.name}</span>
                                                            <div className="flex items-center gap-4"><span className="text-xs font-medium text-gray-700">{formatCompact(c.value)}</span><span className="text-xs text-gray-400 w-12 text-right">{c.pct.toFixed(1)}%</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}