"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    RefreshCw,
    DollarSign,
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    Receipt,
    BarChart3,
    Target,
} from "lucide-react";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from "recharts";

// ──────────────────────────────────────
// Types 2
// ──────────────────────────────────────
interface SalesSummary {
    totalSales: number;
    totalTransactions: number;
    avgTicket: number;
    salesThisMonth: number;
    salesLastMonth: number;
    growthPct: number;
    topCategory: string;
}

interface MonthlySales {
    month: string;
    monthLabel: string;
    totalSales: number;
    transactionCount: number;
    avgTicket: number;
    salesByCategory: Record<string, number>;
}

interface CategorySales {
    categoria: string;
    total: number;
    count: number;
    percentage: number;
}

interface RecentSale {
    fecha: string;
    descripcion: string;
    banco: string;
    categoria: string;
    tipo: string;
    monto: number;
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────
const MONTHS_ES: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

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

const CATEGORY_COLORS = [
    '#6366F1', '#8B5CF6', '#A78BFA', '#10B981', '#34D399',
    '#F59E0B', '#FBBF24', '#EF4444', '#F87171', '#3B82F6',
    '#60A5FA', '#EC4899', '#F472B6', '#14B8A6', '#2DD4BF',
];

// ──────────────────────────────────────
// Page
// ──────────────────────────────────────
export default function VentasPage() {
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'USD' | 'COP'>('USD');
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
    const [salesByCategory, setSalesByCategory] = useState<CategorySales[]>([]);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sales?currency=${currency}`);
            const result = await res.json();
            if (result.success) {
                setSummary(result.summary);
                setMonthlySales(result.monthlySales || []);
                setSalesByCategory(result.salesByCategory || []);
                setRecentSales(result.recentSales || []);
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

    // ── Format helpers ──
    const formatCurrency = (value: number | null | undefined) => {
        const val = value ?? 0;
        if (currency === 'COP') {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency', currency: 'COP',
                minimumFractionDigits: 0, maximumFractionDigits: 0,
            }).format(val);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD',
            minimumFractionDigits: 0, maximumFractionDigits: 0,
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

    function formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return dateStr;
    }

    // ── Derived data ──
    const cumulativeSalesData = useMemo(() => {
        let cumulative = 0;
        return monthlySales.map(m => {
            cumulative += m.totalSales;
            return { ...m, cumulative };
        });
    }, [monthlySales]);

    const avgTicketGlobal = useMemo(() => {
        if (!summary) return 0;
        return summary.avgTicket;
    }, [summary]);

    // ── Custom Tooltips ──
    const SalesTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-lg font-semibold">{formatCurrency(data.totalSales)}</p>
                <p className="text-sm text-gray-400">{data.transactionCount} transacciones</p>
            </div>
        );
    };

    const CumulativeTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-lg font-semibold">{formatCurrencyCompact(data.cumulative)}</p>
                <p className="text-sm text-gray-400">Mes: {formatCurrency(data.totalSales)}</p>
            </div>
        );
    };

    const TicketTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-lg font-semibold">{formatCurrency(data.avgTicket)}</p>
                <p className="text-sm text-gray-400">{data.transactionCount} pagos</p>
            </div>
        );
    };

    // ── Loading / Error ──
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando datos de ventas...
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Dashboard de Ventas</h1>
                        <p className="text-sm text-gray-500">Análisis de ingresos y transacciones</p>
                    </div>
                    <div className="flex items-center gap-4">
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

            <div className="p-8 space-y-6">
                {/* ── KPIs Row ── */}
                <div className="grid grid-cols-4 gap-4">
                    {/* Ventas Totales */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-sm text-gray-500">Ventas Totales</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrencyCompact(summary.totalSales)}</p>
                        <p className="text-xs text-gray-400 mt-1">Histórico acumulado</p>
                    </div>

                    {/* Transacciones */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Receipt className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-sm text-gray-500">Transacciones</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{summary.totalTransactions.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">Total de ventas registradas</p>
                    </div>

                    {/* Ticket Promedio */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm text-gray-500">Ticket Promedio</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgTicket)}</p>
                        <p className="text-xs text-gray-400 mt-1">Por transacción</p>
                    </div>

                    {/* Crecimiento MoM */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${summary.growthPct >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                {summary.growthPct >= 0
                                    ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    : <TrendingDown className="w-5 h-5 text-red-600" />
                                }
                            </div>
                            <span className="text-sm text-gray-500">Crecimiento MoM</span>
                        </div>
                        <p className={`text-2xl font-bold ${summary.growthPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {summary.growthPct >= 0 ? '+' : ''}{summary.growthPct.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Este mes: {formatCurrencyCompact(summary.salesThisMonth)}
                        </p>
                    </div>
                </div>

                {/* ── Charts Row 1: Ventas Mensuales + Acumuladas ── */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Ventas Mensuales */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-gray-900">Ventas Mensuales</h2>
                            {monthlySales.length > 0 && (
                                <span className="text-sm font-medium text-indigo-600">
                                    {formatCurrencyCompact(monthlySales[monthlySales.length - 1]?.totalSales)} último mes
                                </span>
                            )}
                        </div>
                        <div className="h-64">
                            {monthlySales.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlySales} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                                            tickFormatter={(val) => formatCurrencyCompact(val)}
                                        />
                                        <Tooltip content={<SalesTooltip />} />
                                        <Bar
                                            dataKey="totalSales"
                                            fill={COLORS.primary}
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={50}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                    </div>

                    {/* Ventas Acumuladas */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-gray-900">Ventas Acumuladas</h2>
                            {cumulativeSalesData.length > 0 && (
                                <span className="text-sm font-medium text-emerald-600">
                                    {formatCurrencyCompact(cumulativeSalesData[cumulativeSalesData.length - 1]?.cumulative)} total
                                </span>
                            )}
                        </div>
                        <div className="h-64">
                            {cumulativeSalesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={cumulativeSalesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={COLORS.success} stopOpacity={0.2} />
                                                <stop offset="100%" stopColor={COLORS.success} stopOpacity={0} />
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
                                            tickFormatter={(val) => formatCurrencyCompact(val)}
                                        />
                                        <Tooltip content={<CumulativeTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke={COLORS.success}
                                            strokeWidth={2}
                                            fill="url(#cumulativeGradient)"
                                            dot={{ fill: COLORS.success, strokeWidth: 0, r: 4 }}
                                            activeDot={{ fill: COLORS.success, strokeWidth: 2, stroke: '#fff', r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Charts Row 2: Categorías + Ticket Promedio ── */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Distribución por Categoría */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-gray-900">Distribución por Categoría</h2>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                <BarChart3 className="w-3.5 h-3.5" />
                                Top: {summary.topCategory}
                            </div>
                        </div>
                        <div className="h-64">
                            {salesByCategory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={salesByCategory.slice(0, 8)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} horizontal={false} />
                                        <XAxis
                                            type="number"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: COLORS.grayLight, fontSize: 11 }}
                                            tickFormatter={(val) => formatCurrencyCompact(val)}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="categoria"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: COLORS.gray, fontSize: 11 }}
                                            width={120}
                                        />
                                        <Tooltip
                                            formatter={(value: number | string | Array<number | string> | undefined) => [formatCurrency(typeof value === 'number' ? value : 0), 'Total']}
                                            labelStyle={{ fontWeight: 600 }}
                                            contentStyle={{
                                                background: COLORS.tooltipBg,
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                            {salesByCategory.slice(0, 8).map((_, index) => (
                                                <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                    </div>

                    {/* Ticket Promedio Mensual */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-gray-900">Ticket Promedio Mensual</h2>
                            <span className="text-sm font-medium text-blue-600">
                                Promedio: {formatCurrency(avgTicketGlobal)}
                            </span>
                        </div>
                        <div className="h-64">
                            {monthlySales.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlySales} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                                            tickFormatter={(val) => formatCurrencyCompact(val)}
                                        />
                                        <Tooltip content={<TicketTooltip />} />
                                        <ReferenceLine
                                            y={avgTicketGlobal}
                                            stroke={COLORS.warning}
                                            strokeDasharray="6 4"
                                            strokeWidth={1.5}
                                            label={{ value: `Prom: ${formatCurrencyCompact(avgTicketGlobal)}`, position: 'right', fill: COLORS.warning, fontSize: 11 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="avgTicket"
                                            stroke="#3B82F6"
                                            strokeWidth={2}
                                            dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }}
                                            activeDot={{ fill: '#3B82F6', strokeWidth: 2, stroke: '#fff', r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No hay datos</div>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-blue-500 rounded"></div>
                                <span>Ticket promedio</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-amber-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #F59E0B, #F59E0B 4px, transparent 4px, transparent 8px)' }}></div>
                                <span>Promedio global</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Detalle mensual table + Ventas recientes ── */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Detalle Mensual */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">Detalle Mensual</h2>
                            <span className="text-xs text-gray-400">{monthlySales.length} meses</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/80 sticky top-0">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Mes</th>
                                        <th className="text-right px-3 py-2.5 font-medium text-gray-500">Ventas</th>
                                        <th className="text-right px-3 py-2.5 font-medium text-gray-500">Txns</th>
                                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">Ticket</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[...monthlySales].reverse().map(m => (
                                        <tr key={m.month} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-2.5 font-medium text-gray-900">{m.monthLabel}</td>
                                            <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">{formatCurrencyCompact(m.totalSales)}</td>
                                            <td className="text-right px-3 py-2.5 text-gray-600 tabular-nums">{m.transactionCount}</td>
                                            <td className="text-right px-4 py-2">
                                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums ${m.avgTicket >= avgTicketGlobal ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-gray-900'}`}>
                                                    {formatCurrency(m.avgTicket)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ventas Recientes */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">Ventas Recientes</h2>
                            <span className="text-xs text-gray-400">Últimas 15</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {recentSales.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/80 sticky top-0">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">Fecha</th>
                                            <th className="text-left px-3 py-2.5 font-medium text-gray-500">Descripción</th>
                                            <th className="text-right px-4 py-2.5 font-medium text-gray-500">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {recentSales.map((sale, idx) => (
                                            <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(sale.fecha)}</td>
                                                <td className="px-3 py-2.5">
                                                    <p className="font-medium text-gray-900 truncate max-w-[200px]">{sale.descripcion}</p>
                                                    <p className="text-xs text-gray-400">{sale.banco} · {sale.categoria}</p>
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-emerald-600 font-medium tabular-nums">
                                                    +{formatCurrency(sale.monto)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-400">No hay ventas recientes</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Category Breakdown Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Desglose por Categoría</h2>
                        <span className="text-xs text-gray-400">{salesByCategory.length} categorías</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/80 sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Categoría</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Total</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Txns</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">%</th>
                                    <th className="px-4 py-2.5 font-medium text-gray-500 w-40">Proporción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {salesByCategory.map((cat, idx) => (
                                    <tr key={cat.categoria} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                                                />
                                                <span className="font-medium text-gray-900">{cat.categoria}</span>
                                            </div>
                                        </td>
                                        <td className="text-right px-3 py-3 text-gray-600 font-medium tabular-nums">{formatCurrencyCompact(cat.total)}</td>
                                        <td className="text-right px-3 py-3 text-gray-600 tabular-nums">{cat.count}</td>
                                        <td className="text-right px-3 py-3 text-gray-600 tabular-nums">{cat.percentage.toFixed(1)}%</td>
                                        <td className="px-4 py-3">
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(cat.percentage, 100)}%`,
                                                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
