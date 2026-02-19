"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    X
} from "lucide-react";

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

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function SaldosPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [month, setMonth] = useState<number | null>(null);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [filterBanco, setFilterBanco] = useState<string>('');
    const [bancos, setBancos] = useState<string[]>([]);
    const [dateRangeType, setDateRangeType] = useState<'year' | 'month' | 'custom'>('year');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalTransactions, setModalTransactions] = useState<Transaction[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/transactions?all=true');
            const result = await response.json();
            if (result.success) {
                setTransactions(result.transactions);

                const years = new Set<number>();
                const bancosSet = new Set<string>();
                result.transactions.forEach((tx: Transaction) => {
                    const date = parseDate(tx.fecha);
                    if (date.getFullYear() > 2000) {
                        years.add(date.getFullYear());
                    }
                    if (tx.banco) bancosSet.add(tx.banco);
                });
                const sortedYears = Array.from(years).sort((a, b) => b - a);
                setAvailableYears(sortedYears);
                setBancos(Array.from(bancosSet).sort());
                if (sortedYears.length > 0 && !sortedYears.includes(year)) {
                    setYear(sortedYears[0]);
                }
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const parseDate = (dateStr: string): Date => {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
    };

    const formatCurrency = (value: number, compact = false) => {
        const absValue = Math.abs(value);
        if (compact && absValue >= 1000000) {
            if (currency === 'USD') {
                return `$${(value / 1000000).toFixed(1)}M`;
            }
            return `$${(value / 1000000).toFixed(0)}M`;
        }
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value);
        }
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return dateStr;
    };

    const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

    const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';

    // Filtrar transacciones según el rango de fechas seleccionado
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const date = parseDate(tx.fecha);
            const matchBanco = filterBanco ? tx.banco === filterBanco : true;

            let matchDate = false;
            if (dateRangeType === 'year') {
                matchDate = date.getFullYear() === year;
            } else if (dateRangeType === 'month' && month !== null) {
                matchDate = date.getFullYear() === year && date.getMonth() === month;
            } else if (dateRangeType === 'custom' && customStartDate && customEndDate) {
                const start = new Date(customStartDate);
                const end = new Date(customEndDate);
                end.setHours(23, 59, 59);
                matchDate = date >= start && date <= end;
            } else {
                matchDate = date.getFullYear() === year;
            }

            return matchDate && matchBanco;
        });
    }, [transactions, year, month, filterBanco, dateRangeType, customStartDate, customEndDate]);

    // KPIs principales
    const kpis = useMemo(() => {
        const ingresos = filteredTransactions
            .filter(tx => tx[valueKey] > 0)
            .reduce((sum, tx) => sum + tx[valueKey], 0);

        const egresos = filteredTransactions
            .filter(tx => tx[valueKey] < 0)
            .reduce((sum, tx) => sum + Math.abs(tx[valueKey]), 0);

        const saldo = ingresos - egresos;
        const numTransacciones = filteredTransactions.length;

        return { ingresos, egresos, saldo, numTransacciones };
    }, [filteredTransactions, valueKey]);

    // Saldos por banco
    const saldosPorBanco = useMemo(() => {
        const grouped: Record<string, { ingresos: number; egresos: number; saldo: number; transactions: Transaction[] }> = {};

        filteredTransactions.forEach(tx => {
            const banco = tx.banco || 'Sin Banco';
            if (!grouped[banco]) grouped[banco] = { ingresos: 0, egresos: 0, saldo: 0, transactions: [] };

            if (tx[valueKey] > 0) {
                grouped[banco].ingresos += tx[valueKey];
            } else {
                grouped[banco].egresos += Math.abs(tx[valueKey]);
            }
            grouped[banco].saldo += tx[valueKey];
            grouped[banco].transactions.push(tx);
        });

        return Object.entries(grouped)
            .map(([banco, data]) => ({ banco, ...data }))
            .sort((a, b) => b.saldo - a.saldo);
    }, [filteredTransactions, valueKey]);

    // Evolución mensual del saldo (para el año seleccionado)
    const evolucionMensual = useMemo(() => {
        const yearTxs = transactions.filter(tx => {
            const date = parseDate(tx.fecha);
            return date.getFullYear() === year;
        });

        const monthly = MONTHS.map((_, idx) => {
            const monthTxs = yearTxs.filter(tx => {
                const date = parseDate(tx.fecha);
                return date.getMonth() === idx;
            });

            const ingresos = monthTxs.filter(tx => tx[valueKey] > 0).reduce((sum, tx) => sum + tx[valueKey], 0);
            const egresos = monthTxs.filter(tx => tx[valueKey] < 0).reduce((sum, tx) => sum + Math.abs(tx[valueKey]), 0);
            const saldo = ingresos - egresos;

            return { ingresos, egresos, saldo };
        });

        // Calcular saldo acumulado
        let acumulado = 0;
        return monthly.map((m, idx) => {
            acumulado += m.saldo;
            return { ...m, acumulado, mes: MONTHS[idx] };
        });
    }, [transactions, year, valueKey]);

    // Evolución por banco (mensual)
    const evolucionPorBanco = useMemo(() => {
        const result: Record<string, number[]> = {};

        bancos.forEach(banco => {
            result[banco] = MONTHS.map((_, idx) => {
                const monthTxs = transactions.filter(tx => {
                    const date = parseDate(tx.fecha);
                    return date.getFullYear() === year && date.getMonth() === idx && tx.banco === banco;
                });
                return monthTxs.reduce((sum, tx) => sum + tx[valueKey], 0);
            });
        });

        return result;
    }, [transactions, year, bancos, valueKey]);

    // Distribución de ingresos por banco
    const distribucionIngresos = useMemo(() => {
        const total = kpis.ingresos;
        return saldosPorBanco
            .filter(b => b.ingresos > 0)
            .map(b => ({
                banco: b.banco,
                valor: b.ingresos,
                percent: total > 0 ? (b.ingresos / total) * 100 : 0
            }))
            .sort((a, b) => b.valor - a.valor);
    }, [saldosPorBanco, kpis.ingresos]);

    // Distribución de egresos por banco
    const distribucionEgresos = useMemo(() => {
        const total = kpis.egresos;
        return saldosPorBanco
            .filter(b => b.egresos > 0)
            .map(b => ({
                banco: b.banco,
                valor: b.egresos,
                percent: total > 0 ? (b.egresos / total) * 100 : 0
            }))
            .sort((a, b) => b.valor - a.valor);
    }, [saldosPorBanco, kpis.egresos]);

    const maxEvolucion = Math.max(...evolucionMensual.map(m => Math.max(m.ingresos, m.egresos)), 1);
    const maxAcumulado = Math.max(...evolucionMensual.map(m => Math.abs(m.acumulado)), 1);
    const minAcumulado = Math.min(...evolucionMensual.map(m => m.acumulado), 0);

    const openDetail = (title: string, txs: Transaction[]) => {
        setModalTitle(title);
        setModalTransactions(txs);
        setModalOpen(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando dashboard de saldos...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F7F8]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 sticky top-0 z-30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="ml-12 lg:ml-0">
                        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Dashboard de Saldos</h1>
                        <p className="text-sm text-gray-500">Análisis detallado de movimientos y saldos</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                        <button
                            onClick={fetchData}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Tipo de rango de fecha */}
                        <select
                            value={dateRangeType}
                            onChange={(e) => setDateRangeType(e.target.value as 'year' | 'month' | 'custom')}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                            <option value="year">Por año</option>
                            <option value="month">Por mes</option>
                            <option value="custom">Personalizado</option>
                        </select>

                        {/* Filtros según tipo */}
                        {dateRangeType === 'year' && (
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        )}

                        {dateRangeType === 'month' && (
                            <>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <select
                                    value={month ?? ''}
                                    onChange={(e) => setMonth(e.target.value === '' ? null : parseInt(e.target.value))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="">Seleccionar mes</option>
                                    {MONTHS.map((m, idx) => (
                                        <option key={idx} value={idx}>{m}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        {dateRangeType === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                                <span className="text-gray-400">a</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                            </>
                        )}

                        {/* Filtro de banco */}
                        <select
                            value={filterBanco}
                            onChange={(e) => setFilterBanco(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                            <option value="">Todos los bancos</option>
                            {bancos.map(banco => (
                                <option key={banco} value={banco}>{banco}</option>
                            ))}
                        </select>

                        {/* Toggle moneda */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setCurrency('COP')}
                                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${currency === 'COP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                    }`}
                            >
                                COP
                            </button>
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                    }`}
                            >
                                USD
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-4 lg:p-8 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Wallet className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm text-gray-500">Saldo Neto</span>
                        </div>
                        <p className={`text-2xl lg:text-3xl font-bold ${kpis.saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            {formatCurrency(kpis.saldo, true)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{kpis.numTransacciones} transacciones</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <ArrowUpRight className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-500">Total Ingresos</span>
                        </div>
                        <p className="text-2xl lg:text-3xl font-bold text-green-600">{formatCurrency(kpis.ingresos, true)}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <ArrowDownRight className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-sm text-gray-500">Total Egresos</span>
                        </div>
                        <p className="text-2xl lg:text-3xl font-bold text-red-600">{formatCurrency(kpis.egresos, true)}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-sm text-gray-500">Ratio I/E</span>
                        </div>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                            {kpis.egresos > 0 ? (kpis.ingresos / kpis.egresos).toFixed(2) : '∞'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Ingresos / Egresos</p>
                    </div>
                </div>

                {/* Saldos por Banco */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Saldos por Banco</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {saldosPorBanco.map((banco, idx) => (
                            <div
                                key={banco.banco}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => openDetail(`Transacciones - ${banco.banco}`, banco.transactions)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    />
                                    <p className="text-sm text-gray-500 truncate">{banco.banco}</p>
                                </div>
                                <p className={`text-xl font-bold ${banco.saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                    {formatCurrency(banco.saldo, true)}
                                </p>
                                <div className="flex items-center justify-between mt-2 text-xs">
                                    <span className="text-green-600">+{formatCurrency(banco.ingresos, true)}</span>
                                    <span className="text-red-600">-{formatCurrency(banco.egresos, true)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ingresos vs Egresos por mes */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Egresos - {year}</h2>
                        <div className="h-64 flex items-end gap-1">
                            {evolucionMensual.map((m, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex items-end justify-center gap-0.5 h-52">
                                        <div
                                            className="w-1/2 bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                                            style={{ height: `${(m.ingresos / maxEvolucion) * 100}%`, minHeight: m.ingresos > 0 ? '2px' : '0' }}
                                            title={`Ingresos: ${formatCurrency(m.ingresos)}`}
                                        />
                                        <div
                                            className="w-1/2 bg-red-500 rounded-t hover:bg-red-600 transition-colors cursor-pointer"
                                            style={{ height: `${(m.egresos / maxEvolucion) * 100}%`, minHeight: m.egresos > 0 ? '2px' : '0' }}
                                            title={`Egresos: ${formatCurrency(m.egresos)}`}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{m.mes}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded" />
                                <span className="text-sm text-gray-600">Ingresos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded" />
                                <span className="text-sm text-gray-600">Egresos</span>
                            </div>
                        </div>
                    </div>

                    {/* Evolución del saldo acumulado */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Saldo Acumulado - {year}</h2>
                        <div className="h-64 relative">
                            <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="none">
                                {/* Línea base en 0 */}
                                <line
                                    x1="0"
                                    y1={minAcumulado < 0 ? 30 + (maxAcumulado / (maxAcumulado - minAcumulado)) * 30 : 55}
                                    x2="100"
                                    y2={minAcumulado < 0 ? 30 + (maxAcumulado / (maxAcumulado - minAcumulado)) * 30 : 55}
                                    stroke="#E5E7EB"
                                    strokeWidth="0.5"
                                    strokeDasharray="2,2"
                                />

                                {/* Área bajo la curva */}
                                <path
                                    d={`M 0,55 ${evolucionMensual.map((m, idx) => {
                                        const x = (idx / 11) * 100;
                                        const range = maxAcumulado - minAcumulado || 1;
                                        const y = 55 - ((m.acumulado - minAcumulado) / range) * 50;
                                        return `L ${x},${y}`;
                                    }).join(' ')} L 100,55 Z`}
                                    fill="url(#gradient)"
                                    opacity="0.3"
                                />

                                {/* Línea del saldo */}
                                <polyline
                                    points={evolucionMensual.map((m, idx) => {
                                        const x = (idx / 11) * 100;
                                        const range = maxAcumulado - minAcumulado || 1;
                                        const y = 55 - ((m.acumulado - minAcumulado) / range) * 50;
                                        return `${x},${y}`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#0EA5E9"
                                    strokeWidth="2"
                                />

                                {/* Puntos */}
                                {evolucionMensual.map((m, idx) => {
                                    const x = (idx / 11) * 100;
                                    const range = maxAcumulado - minAcumulado || 1;
                                    const y = 55 - ((m.acumulado - minAcumulado) / range) * 50;
                                    return (
                                        <circle
                                            key={idx}
                                            cx={x}
                                            cy={y}
                                            r="1.5"
                                            fill="#0EA5E9"
                                            className="hover:r-3 cursor-pointer"
                                        >
                                            <title>{`${m.mes}: ${formatCurrency(m.acumulado)}`}</title>
                                        </circle>
                                    );
                                })}

                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#0EA5E9" />
                                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            {/* Etiquetas de meses */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                                {MONTHS.map((m, idx) => (
                                    <span key={idx} className="text-xs text-gray-400">{idx % 2 === 0 ? m : ''}</span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <span className="text-sm text-gray-500">Saldo final: </span>
                            <span className={`font-semibold ${evolucionMensual[11]?.acumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(evolucionMensual[11]?.acumulado || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Distribución de ingresos y egresos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Distribución Ingresos */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Ingresos por Banco</h2>
                        <div className="flex items-center gap-6">
                            {/* Dona */}
                            <div className="relative w-40 h-40 flex-shrink-0">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {(() => {
                                        let offset = 0;
                                        return distribucionIngresos.map((item, idx) => {
                                            const angle = (item.percent / 100) * 360;
                                            const startAngle = offset;
                                            const endAngle = offset + angle;
                                            offset = endAngle;

                                            const startRad = (startAngle * Math.PI) / 180;
                                            const endRad = (endAngle * Math.PI) / 180;

                                            const x1 = 50 + 40 * Math.cos(startRad);
                                            const y1 = 50 + 40 * Math.sin(startRad);
                                            const x2 = 50 + 40 * Math.cos(endRad);
                                            const y2 = 50 + 40 * Math.sin(endRad);

                                            const largeArc = angle > 180 ? 1 : 0;

                                            return (
                                                <path
                                                    key={item.banco}
                                                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={COLORS[idx % COLORS.length]}
                                                    className="hover:opacity-80 cursor-pointer"
                                                />
                                            );
                                        });
                                    })()}
                                    <circle cx="50" cy="50" r="25" fill="white" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(kpis.ingresos, true)}</p>
                                </div>
                            </div>

                            {/* Lista */}
                            <div className="flex-1 space-y-2">
                                {distribucionIngresos.slice(0, 5).map((item, idx) => (
                                    <div key={item.banco} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-sm text-gray-600 truncate">{item.banco}</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{item.percent.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Distribución Egresos */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Egresos por Banco</h2>
                        <div className="flex items-center gap-6">
                            {/* Dona */}
                            <div className="relative w-40 h-40 flex-shrink-0">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {(() => {
                                        let offset = 0;
                                        return distribucionEgresos.map((item, idx) => {
                                            const angle = (item.percent / 100) * 360;
                                            const startAngle = offset;
                                            const endAngle = offset + angle;
                                            offset = endAngle;

                                            const startRad = (startAngle * Math.PI) / 180;
                                            const endRad = (endAngle * Math.PI) / 180;

                                            const x1 = 50 + 40 * Math.cos(startRad);
                                            const y1 = 50 + 40 * Math.sin(startRad);
                                            const x2 = 50 + 40 * Math.cos(endRad);
                                            const y2 = 50 + 40 * Math.sin(endRad);

                                            const largeArc = angle > 180 ? 1 : 0;

                                            return (
                                                <path
                                                    key={item.banco}
                                                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={COLORS[idx % COLORS.length]}
                                                    className="hover:opacity-80 cursor-pointer"
                                                />
                                            );
                                        });
                                    })()}
                                    <circle cx="50" cy="50" r="25" fill="white" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(kpis.egresos, true)}</p>
                                </div>
                            </div>

                            {/* Lista */}
                            <div className="flex-1 space-y-2">
                                {distribucionEgresos.slice(0, 5).map((item, idx) => (
                                    <div key={item.banco} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-sm text-gray-600 truncate">{item.banco}</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{item.percent.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla detallada */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 lg:px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Detalle por Banco</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 lg:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Banco</th>
                                    <th className="text-right px-4 lg:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ingresos</th>
                                    <th className="text-right px-4 lg:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Egresos</th>
                                    <th className="text-right px-4 lg:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                                    <th className="text-right px-4 lg:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Transacciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {saldosPorBanco.map((banco, idx) => (
                                    <tr
                                        key={banco.banco}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => openDetail(`Transacciones - ${banco.banco}`, banco.transactions)}
                                    >
                                        <td className="px-4 lg:px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <span className="font-medium text-gray-900">{banco.banco}</span>
                                            </div>
                                        </td>
                                        <td className="text-right px-4 lg:px-6 py-4 text-green-600 font-medium">
                                            {formatCurrency(banco.ingresos)}
                                        </td>
                                        <td className="text-right px-4 lg:px-6 py-4 text-red-600 font-medium">
                                            {formatCurrency(banco.egresos)}
                                        </td>
                                        <td className={`text-right px-4 lg:px-6 py-4 font-bold ${banco.saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                            {formatCurrency(banco.saldo)}
                                        </td>
                                        <td className="text-right px-4 lg:px-6 py-4 text-gray-500">
                                            {banco.transactions.length}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-semibold">
                                <tr>
                                    <td className="px-4 lg:px-6 py-3 text-gray-900">TOTAL</td>
                                    <td className="text-right px-4 lg:px-6 py-3 text-green-600">{formatCurrency(kpis.ingresos)}</td>
                                    <td className="text-right px-4 lg:px-6 py-3 text-red-600">{formatCurrency(kpis.egresos)}</td>
                                    <td className={`text-right px-4 lg:px-6 py-3 ${kpis.saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                        {formatCurrency(kpis.saldo)}
                                    </td>
                                    <td className="text-right px-4 lg:px-6 py-3 text-gray-600">{kpis.numTransacciones}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de detalle */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Descripción</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Categoría</th>
                                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {modalTransactions
                                        .sort((a, b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime())
                                        .map((tx, idx) => {
                                            const monto = currency === 'COP' ? tx.valorCOP : tx.valorUSD;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-600">{formatDate(tx.fecha)}</td>
                                                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{tx.descripcion}</td>
                                                    <td className="px-4 py-3 text-gray-600">{tx.categoria}</td>
                                                    <td className={`px-4 py-3 text-right font-medium ${monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(monto)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-500">
                                {modalTransactions.length} transacciones | Total: {' '}
                                <span className={`font-semibold ${modalTransactions.reduce((sum, tx) => sum + tx[valueKey], 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(modalTransactions.reduce((sum, tx) => sum + tx[valueKey], 0))}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}