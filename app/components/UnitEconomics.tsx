'use client';

import React, { useEffect, useState } from 'react';
import {
    RefreshCw,
    DollarSign,
    Users,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    ChevronDown,
    ChevronUp,
    Wallet,
    PiggyBank,
    Banknote,
    Activity,
    Flame
} from 'lucide-react';

interface MonthlyMetrics {
    mes: string;
    mesLabel: string;
    activosInicio: number;
    nuevos: number;
    cancelaciones: number;
    activosFin: number;
    churnRate: number;
    revenue: number;
    pagos: number;
    arpu: number;
    lifetime: number;
    ltv: number;
    pauta: number;
    cac: number;
    ltvCacRatio: number;
    costoVariable: number;
    costoVariablePorCliente: number;
    margenBruto: number;
    margenBrutoPct: number;
    paybackMeses: number;
}

interface Financials {
    grossProfit: number;
    netIncome: number;
    netMarginPct: number;
    burnRate: number;
    runway: number;
    costosFijos: number;
    cajaAlCierre: number;
}

interface UnitEconomicsResponse {
    success: boolean;
    trm: number;
    mesSeleccionado: string;
    mesSeleccionadoLabel: string;
    analisis: {
        estado: 'HEALTHY' | 'ON_TRACK' | 'AT_RISK';
        estadoLabel: string;
        resumenEjecutivo: string;
        hallazgos: string[];
        riesgos: string[];
        recomendaciones: string[];
    };
    metricas: MonthlyMetrics;
    financials: Financials;
    metricasMesAnterior: MonthlyMetrics | null;
    historico: MonthlyMetrics[];
    mesesDisponibles: Array<{ valor: string; label: string }>;
    benchmarks: {
        ltvCacSaludable: number;
        churnBueno: number;
        paybackMaximo: number;
        margenBrutoMinimo: number;
    };
}

interface Props {
    currency: 'USD' | 'COP';
}

export default function UnitEconomics({ currency }: Props) {
    const [mesSeleccionado, setMesSeleccionado] = useState<string>('');
    const [data, setData] = useState<UnitEconomicsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detailsExpanded, setDetailsExpanded] = useState(false);

    const fetchData = async (mes?: string) => {
        setLoading(true);
        setError(null);
        try {
            const url = mes
                ? `/api/unit-economics?mes=${mes}`
                : '/api/unit-economics';
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setData(json);
                setMesSeleccionado(json.mesSeleccionado);
            } else {
                setError(json.error);
            }
        } catch (e) {
            setError('Error al cargar datos');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatVal = (value: number, isCurrency = true, isPercent = false, digits = 0) => {
        let val = value;
        if (isCurrency && currency === 'COP') {
            val = value * (data?.trm || 4200);
        }

        if (isPercent) {
            return `${val.toFixed(1)}%`;
        }

        if (isCurrency) {
            return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            }).format(val);
        }

        return val.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    };

    const calculateDelta = (current: number, previous: number | undefined) => {
        if (previous === undefined || previous === 0) return null;
        const delta = ((current - previous) / previous) * 100;
        return delta;
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-gray-500 font-medium">Calculando Unit Economics para la junta directiva...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-800 mb-2">Error en el reporte</h3>
                <p className="text-red-600 mb-6">{error || 'No se pudieron cargar los datos de rentabilidad.'}</p>
                <button
                    onClick={() => fetchData()}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                    Reintentar carga
                </button>
            </div>
        );
    }

    const { analisis, metricas, financials, metricasMesAnterior, historico, mesesDisponibles, benchmarks } = data;

    const getStatusBadge = (estado: string, label: string) => {
        switch (estado) {
            case 'HEALTHY':
                return (
                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                        {label}
                    </span>
                );
            case 'ON_TRACK':
                return (
                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                        {label}
                    </span>
                );
            case 'AT_RISK':
                return (
                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm">
                        {label}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* SECCIÓN 0: Header con Selector y Estatus */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                        {data.mesSeleccionadoLabel}
                    </h1>
                    {getStatusBadge(analisis.estado, analisis.estadoLabel)}
                </div>

                <div className="flex items-center gap-3">
                    <label htmlFor="mes-selector" className="text-sm font-medium text-gray-500">Período:</label>
                    <div className="relative min-w-[180px]">
                        <select
                            id="mes-selector"
                            value={mesSeleccionado}
                            onChange={(e) => fetchData(e.target.value)}
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-4 pr-10 py-2.5 cursor-pointer hover:bg-white transition-colors font-medium shadow-sm"
                        >
                            {mesesDisponibles.map((m) => (
                                <option key={m.valor} value={m.valor}>{m.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 1: KPIs Principales (Unit Economics) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* LTV:CAC */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full hover:border-indigo-100 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">LTV:CAC Ratio</p>
                            <TargetIcon metric={metricas.ltvCacRatio} benchmark={benchmarks.ltvCacSaludable} type="ge" />
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">
                            {metricas.ltvCacRatio === -1 ? '∞' : `${metricas.ltvCacRatio.toFixed(1)}x`}
                        </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Objetivo: ≥{benchmarks.ltvCacSaludable}x</span>
                        {(() => {
                            const delta = calculateDelta(metricas.ltvCacRatio, metricasMesAnterior?.ltvCacRatio);
                            if (delta === null || metricas.ltvCacRatio === -1) return null;
                            const isGood = delta >= 0;
                            return (
                                <span className={`text-xs font-bold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isGood ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}%
                                </span>
                            );
                        })()}
                    </div>
                </div>

                {/* CAC */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full hover:border-indigo-100 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">CAC</p>
                            <Users className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{formatVal(metricas.cac)}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Costo Adquisición</span>
                        {(() => {
                            const delta = calculateDelta(metricas.cac, metricasMesAnterior?.cac);
                            if (delta === null) return null;
                            const isGood = delta <= 0; // CAC bajando es bueno
                            return (
                                <span className={`text-xs font-bold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isGood ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}%
                                </span>
                            );
                        })()}
                    </div>
                </div>

                {/* LTV */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full hover:border-indigo-100 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">LTV</p>
                            <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{formatVal(metricas.ltv)}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Lifetime Value</span>
                        {(() => {
                            const delta = calculateDelta(metricas.ltv, metricasMesAnterior?.ltv);
                            if (delta === null) return null;
                            const isGood = delta >= 0;
                            return (
                                <span className={`text-xs font-bold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isGood ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}%
                                </span>
                            );
                        })()}
                    </div>
                </div>

                {/* Runway */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full hover:border-indigo-100 transition-colors">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Runway</p>
                            <TargetIcon metric={financials?.runway || 0} benchmark={12} type="lt" inverse={true} />
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">
                            {financials ? `${financials.runway.toFixed(1)} m` : '-'}
                        </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Meses de caja</span>
                        <span className="text-xs font-bold text-amber-500">⚠️ &lt; 12m</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: KPIs Financieros (P&L + Caja) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Gross Profit</p>
                    <p className="text-2xl font-bold text-gray-900">{financials ? formatVal(financials.grossProfit) : '-'}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-1">{metricas.margenBrutoPct}% margen</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Net Income</p>
                    <p className={`text-2xl font-bold ${financials?.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {financials ? formatVal(financials.netIncome) : '-'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs font-medium ${financials?.netMarginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {financials?.netMarginPct}% margen
                        </span>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Caja</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {financials ? formatVal(financials.cajaAlCierre) : '-'}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-1">Saldo acumulado</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Runway</p>
                        {financials && (
                            financials.runway > 12 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> :
                                financials.runway >= 6 ? <AlertTriangle className="w-3 h-3 text-amber-500" /> :
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                    </div>
                    <p className={`text-2xl font-bold ${!financials ? 'text-gray-900' :
                            financials.runway > 12 ? 'text-emerald-600' :
                                financials.runway >= 6 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                        {financials ? `${financials.runway.toFixed(1)} m` : '-'}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-1">
                        Burn: {financials ? formatVal(financials.burnRate) : '-'}/m
                    </p>
                </div>
            </div>

            {/* SECCIÓN 3: Executive Summary & Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8">
                    <div className="flex gap-4 items-start">
                        <div className="p-3 bg-indigo-50 rounded-xl hidden sm:block">
                            <Activity className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="space-y-4 flex-1">
                            <h2 className="text-lg font-bold text-gray-900">Resumen Ejecutivo</h2>
                            <p className="text-base text-gray-700 leading-relaxed font-medium">
                                "{analisis.resumenEjecutivo}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Collapsible Details */}
                <div className="border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setDetailsExpanded(!detailsExpanded)}
                        className="w-full px-8 py-3 flex items-center justify-between text-sm font-bold text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-all uppercase tracking-wide"
                    >
                        <span>Análisis Detallado</span>
                        {detailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {detailsExpanded && (
                        <div className="px-8 pb-8 pt-4 grid md:grid-cols-3 gap-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" /> Hallazgos
                                </h3>
                                <ul className="space-y-2">
                                    {analisis.hallazgos.map((h, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-gray-600 leading-snug">
                                            <span className="text-emerald-400">•</span>
                                            <span>{h}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" /> Riesgos
                                </h3>
                                <ul className="space-y-2">
                                    {analisis.riesgos.map((r, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-gray-600 leading-snug">
                                            <span className="text-red-400">•</span>
                                            <span>{r}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> Recomendaciones
                                </h3>
                                <ul className="space-y-2">
                                    {analisis.recomendaciones.map((rec, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-gray-600 leading-snug">
                                            <span className="text-indigo-400">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIÓN 4: Movimiento de Clientes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Métricas Operativas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">ARPU</p>
                            <p className="text-xl font-bold text-gray-900">{formatVal(metricas.arpu)}</p>
                            <p className="text-xs text-gray-400">Ingreso prom.</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Churn Rate</p>
                            <p className={`text-xl font-bold ${metricas.churnRate > benchmarks.churnBueno ? 'text-red-500' : 'text-emerald-500'}`}>
                                {metricas.churnRate}%
                            </p>
                            <p className="text-xs text-gray-400">Benchmark: &lt;{benchmarks.churnBueno}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Lifetime</p>
                            <p className="text-xl font-bold text-gray-900">{metricas.lifetime} meses</p>
                            <p className="text-xs text-gray-400">Vida promedio</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Payback</p>
                            <p className={`text-xl font-bold ${metricas.paybackMeses <= benchmarks.paybackMaximo ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {metricas.paybackMeses.toFixed(1)} m
                            </p>
                            <p className="text-xs text-gray-400">Recuperación</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Pauta</p>
                            <p className="text-xl font-bold text-gray-900">{formatVal(metricas.pauta)}</p>
                            <p className="text-xs text-gray-400">Inversión Ads</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Margen Bruto</p>
                            <p className={`text-xl font-bold ${metricas.margenBrutoPct > benchmarks.margenBrutoMinimo ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {metricas.margenBrutoPct}%
                            </p>
                            <p className="text-xs text-gray-400">Benchmark: &gt;{benchmarks.margenBrutoMinimo}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Movimiento de Clientes</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Iniciales</span>
                            <span className="font-bold text-gray-900">{metricas.activosInicio}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" /> Nuevos</span>
                            <span className="font-bold text-emerald-600">+{metricas.nuevos}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-red-500" /> Churn</span>
                            <span className="font-bold text-red-600">-{metricas.cancelaciones}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                            <span className="font-bold text-gray-900 text-base">Finales</span>
                            <div className="text-right">
                                <span className="block font-black text-2xl text-indigo-600 leading-none">{metricas.activosFin}</span>
                                <span className={`text-[10px] font-bold ${metricas.activosFin >= metricas.activosInicio ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {metricas.activosFin >= metricas.activosInicio ? '+' : ''}
                                    {metricas.activosInicio > 0 ? (((metricas.activosFin - metricas.activosInicio) / metricas.activosInicio) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 5: Tabla Histórica */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Histórico Completo</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">{historico.length} MESES</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="text-left px-6 py-3 font-bold text-gray-400 uppercase tracking-wider">Mes</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Nuevos</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Churn</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">ARPU</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">CAC</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">LTV</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">LTV:CAC</th>
                                <th className="text-right px-6 py-3 font-bold text-gray-400 uppercase tracking-wider">Pauta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[...historico].reverse().map((h) => {
                                const isSelected = h.mes === mesSeleccionado;
                                return (
                                    <tr
                                        key={h.mes}
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                        onClick={() => fetchData(h.mes)}
                                    >
                                        <td className="px-6 py-3 font-bold text-gray-900 border-l-4 border-transparent">
                                            <div className={`flex items-center gap-2 ${isSelected ? '-ml-1' : ''}`}>
                                                {isSelected && <div className="w-1 h-3 rounded-full bg-indigo-500"></div>}
                                                {h.mesLabel}
                                            </div>
                                        </td>
                                        <td className="text-right px-4 py-3 text-gray-600 font-medium">{h.nuevos}</td>
                                        <td className="text-right px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-sm font-bold ${h.churnRate <= 30 ? 'text-emerald-600 bg-emerald-50' :
                                                h.churnRate <= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
                                                }`}>
                                                {h.churnRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="text-right px-4 py-3 text-gray-600 font-medium">{formatVal(h.arpu)}</td>
                                        <td className="text-right px-4 py-3 text-gray-600 font-medium">{formatVal(h.cac)}</td>
                                        <td className="text-right px-4 py-3 text-gray-600 font-medium">{formatVal(h.ltv)}</td>
                                        <td className="text-right px-4 py-3">
                                            <span className={`font-bold ${h.ltvCacRatio >= 3 || h.ltvCacRatio === -1 ? 'text-emerald-600' :
                                                h.ltvCacRatio >= 1.5 ? 'text-amber-600' : 'text-red-500'
                                                }`}>
                                                {h.ltvCacRatio === -1 ? '∞' : `${h.ltvCacRatio.toFixed(1)}x`}
                                            </span>
                                        </td>
                                        <td className="text-right px-6 py-3 text-gray-400 font-medium">
                                            {formatVal(h.pauta, true, false, 0)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-center text-xs text-gray-300 py-4">
                Fluxi Dashboard • Confidential • {new Date().getFullYear()}
            </p>
        </div>
    );
}

// Helper para iconos de target
function TargetIcon({ metric, benchmark, type, inverse = false }: { metric: number, benchmark: number, type: 'ge' | 'le' | 'lt' | 'gt', inverse?: boolean }) {
    let success = false;

    if (metric === -1 && type === 'ge') success = true; // Caso infinito LTV:CAC
    else {
        switch (type) {
            case 'ge': success = metric >= benchmark; break;
            case 'gt': success = metric > benchmark; break;
            case 'le': success = metric <= benchmark; break;
            case 'lt': success = metric < benchmark; break;
        }
    }

    if (inverse) { // Para casos donde "menor es mejor" (como churn) pero queremos que true signifique "malo"
        // No implementado en este uso simple, mantenemos lógica standard: success = GREEN
    }

    return success
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        : <AlertTriangle className="w-4 h-4 text-amber-500" />;
}
