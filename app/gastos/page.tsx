"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    RefreshCw,
    TrendingDown,
    TrendingUp,
    Calendar,
    DollarSign,
    BarChart3,
    ArrowDownRight,
    ChevronDown,
    ChevronRight,
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
const COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#0EA5E9', '#6366F1', '#8B5CF6', '#A855F7'];

export default function GastosPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [month, setMonth] = useState<number | null>(null);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [filterBanco, setFilterBanco] = useState<string>('');
    const [bancos, setBancos] = useState<string[]>([]);
    const [expandedClasificaciones, setExpandedClasificaciones] = useState<Set<string>>(new Set());

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
                return `$${(absValue / 1000000).toFixed(1)}M`;
            }
            return `$${(absValue / 1000000).toFixed(0)}M`;
        }
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(absValue);
        }
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(absValue);
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

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';

    // Filtrar solo EGRESOS (no traslados, no ingresos) del año seleccionado
    const gastos = useMemo(() => {
        return transactions.filter(tx => {
            const date = parseDate(tx.fecha);
            const matchYear = date.getFullYear() === year;
            const matchMonth = month !== null ? date.getMonth() === month : true;
            const matchBanco = filterBanco ? tx.banco === filterBanco : true;
            // Solo EGRESO - excluir TRASLADO e INGRESO
            const isEgreso = tx.naturaleza?.toUpperCase() === 'EGRESO';
            return matchYear && matchMonth && matchBanco && isEgreso;
        });
    }, [transactions, year, month, filterBanco]);

    // KPIs
    const totalGastos = useMemo(() => {
        return Math.abs(gastos.reduce((sum, tx) => sum + tx[valueKey], 0));
    }, [gastos, valueKey]);

    const diasDelPeriodo = useMemo(() => {
        if (month !== null) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const now = new Date();
            if (year === now.getFullYear() && month === now.getMonth()) {
                return now.getDate();
            }
            return daysInMonth;
        }
        const now = new Date();
        if (year === now.getFullYear()) {
            const start = new Date(year, 0, 1);
            return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 365;
    }, [year, month]);

    const gastoPromedioDiario = totalGastos / (diasDelPeriodo || 1);
    const gastoPromedioMensual = month !== null ? totalGastos : totalGastos / 12;
    const numeroTransacciones = gastos.length;

    // Análisis por TIPO (solo tipos de EGRESO)
    const gastosPorTipo = useMemo(() => {
        const grouped: Record<string, { total: number; count: number; transactions: Transaction[] }> = {};
        gastos.forEach(tx => {
            const tipo = tx.tipo || 'Sin Tipo';
            if (!grouped[tipo]) grouped[tipo] = { total: 0, count: 0, transactions: [] };
            grouped[tipo].total += Math.abs(tx[valueKey]);
            grouped[tipo].count++;
            grouped[tipo].transactions.push(tx);
        });
        return Object.entries(grouped)
            .map(([tipo, data]) => ({
                tipo,
                total: data.total,
                count: data.count,
                percent: totalGastos > 0 ? (data.total / totalGastos) * 100 : 0,
                transactions: data.transactions
            }))
            .sort((a, b) => b.total - a.total);
    }, [gastos, valueKey, totalGastos]);

    // Análisis por Clasificación
    const gastosPorClasificacion = useMemo(() => {
        const grouped: Record<string, { total: number; count: number; transactions: Transaction[]; categorias: Record<string, { total: number; transactions: Transaction[] }> }> = {};
        gastos.forEach(tx => {
            const clas = tx.clasificacion || 'Sin Clasificación';
            const cat = tx.categoria || 'Sin Categoría';
            if (!grouped[clas]) grouped[clas] = { total: 0, count: 0, transactions: [], categorias: {} };
            grouped[clas].total += Math.abs(tx[valueKey]);
            grouped[clas].count++;
            grouped[clas].transactions.push(tx);

            if (!grouped[clas].categorias[cat]) grouped[clas].categorias[cat] = { total: 0, transactions: [] };
            grouped[clas].categorias[cat].total += Math.abs(tx[valueKey]);
            grouped[clas].categorias[cat].transactions.push(tx);
        });
        return Object.entries(grouped)
            .map(([clasificacion, data]) => ({
                clasificacion,
                total: data.total,
                count: data.count,
                percent: totalGastos > 0 ? (data.total / totalGastos) * 100 : 0,
                transactions: data.transactions,
                categorias: Object.entries(data.categorias)
                    .map(([cat, catData]) => ({
                        categoria: cat,
                        total: catData.total,
                        percent: totalGastos > 0 ? (catData.total / totalGastos) * 100 : 0,
                        transactions: catData.transactions
                    }))
                    .sort((a, b) => b.total - a.total)
            }))
            .sort((a, b) => b.total - a.total);
    }, [gastos, valueKey, totalGastos]);

    // Top 10 Categorías
    const topCategorias = useMemo(() => {
        const grouped: Record<string, { total: number; transactions: Transaction[] }> = {};
        gastos.forEach(tx => {
            const cat = tx.categoria || 'Sin Categoría';
            if (!grouped[cat]) grouped[cat] = { total: 0, transactions: [] };
            grouped[cat].total += Math.abs(tx[valueKey]);
            grouped[cat].transactions.push(tx);
        });
        return Object.entries(grouped)
            .map(([categoria, data]) => ({
                categoria,
                total: data.total,
                percent: totalGastos > 0 ? (data.total / totalGastos) * 100 : 0,
                transactions: data.transactions
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [gastos, valueKey, totalGastos]);

    // Gastos por Banco
    const gastosPorBanco = useMemo(() => {
        const grouped: Record<string, { total: number; transactions: Transaction[] }> = {};
        gastos.forEach(tx => {
            const banco = tx.banco || 'Sin Banco';
            if (!grouped[banco]) grouped[banco] = { total: 0, transactions: [] };
            grouped[banco].total += Math.abs(tx[valueKey]);
            grouped[banco].transactions.push(tx);
        });
        return Object.entries(grouped)
            .map(([banco, data]) => ({
                banco,
                total: data.total,
                percent: totalGastos > 0 ? (data.total / totalGastos) * 100 : 0,
                transactions: data.transactions
            }))
            .sort((a, b) => b.total - a.total);
    }, [gastos, valueKey, totalGastos]);

    // Tendencia mensual con top 3 categorías
    const tendenciaMensual = useMemo(() => {
        // Obtener todas las transacciones del año (sin filtro de mes) para la tendencia
        const gastosAnuales = transactions.filter(tx => {
            const date = parseDate(tx.fecha);
            const matchYear = date.getFullYear() === year;
            const matchBanco = filterBanco ? tx.banco === filterBanco : true;
            const isEgreso = tx.naturaleza?.toUpperCase() === 'EGRESO';
            return matchYear && matchBanco && isEgreso;
        });

        // Calcular top 3 categorías del año
        const categoriasTotales: Record<string, number> = {};
        gastosAnuales.forEach(tx => {
            const cat = tx.categoria || 'Sin Categoría';
            if (!categoriasTotales[cat]) categoriasTotales[cat] = 0;
            categoriasTotales[cat] += Math.abs(tx[valueKey]);
        });
        const top3Categorias = Object.entries(categoriasTotales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);

        // Calcular datos mensuales
        const monthly = MONTHS.map((_, idx) => {
            const monthTxs = gastosAnuales.filter(tx => {
                const date = parseDate(tx.fecha);
                return date.getMonth() === idx;
            });

            const total = Math.abs(monthTxs.reduce((sum, tx) => sum + tx[valueKey], 0));

            const byCategoria: Record<string, number> = {};
            monthTxs.forEach(tx => {
                const cat = tx.categoria || 'Sin Categoría';
                if (!byCategoria[cat]) byCategoria[cat] = 0;
                byCategoria[cat] += Math.abs(tx[valueKey]);
            });

            // Valores de top 3
            const top3Values = top3Categorias.map(cat => byCategoria[cat] || 0);
            const otrosValue = total - top3Values.reduce((sum, v) => sum + v, 0);

            return {
                total,
                top3Values,
                otrosValue,
                byCategoria
            };
        });

        return { monthly, top3Categorias };
    }, [transactions, year, filterBanco, valueKey]);

    // Datos para gráfico cuando hay filtro de mes
    const gastosPorCategoriaDelMes = useMemo(() => {
        if (month === null) return [];

        const grouped: Record<string, number> = {};
        gastos.forEach(tx => {
            const cat = tx.categoria || 'Sin Categoría';
            if (!grouped[cat]) grouped[cat] = 0;
            grouped[cat] += Math.abs(tx[valueKey]);
        });

        return Object.entries(grouped)
            .map(([categoria, total]) => ({ categoria, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);
    }, [gastos, month, valueKey]);

    const maxMensual = Math.max(...tendenciaMensual.monthly.map(m => m.total), 1);
    const maxCategoriaDelMes = month !== null ? Math.max(...gastosPorCategoriaDelMes.map(c => c.total), 1) : 1;

    const openDetail = (title: string, txs: Transaction[]) => {
        setModalTitle(title);
        setModalTransactions(txs);
        setModalOpen(true);
    };

    const toggleClasificacion = (clas: string) => {
        const newSet = new Set(expandedClasificaciones);
        if (newSet.has(clas)) newSet.delete(clas);
        else newSet.add(clas);
        setExpandedClasificaciones(newSet);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando análisis de gastos...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F7F8]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Análisis de Gastos</h1>
                        <p className="text-sm text-gray-500">
                            Reporte detallado - {month !== null ? `${MONTHS[month]} ` : ''}{year}
                            {filterBanco && ` - ${filterBanco}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchData}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <select
                            value={filterBanco}
                            onChange={(e) => setFilterBanco(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                        >
                            <option value="">Todos los bancos</option>
                            {bancos.map(banco => (
                                <option key={banco} value={banco}>{banco}</option>
                            ))}
                        </select>

                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <select
                            value={month ?? ''}
                            onChange={(e) => setMonth(e.target.value === '' ? null : parseInt(e.target.value))}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                        >
                            <option value="">Todo el año</option>
                            {MONTHS.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>

                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setCurrency('COP')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'COP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                COP
                            </button>
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                USD
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-8 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-sm text-gray-500">Total Gastos</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGastos, true)}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatCurrency(totalGastos)}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-orange-600" />
                            </div>
                            <span className="text-sm text-gray-500">Promedio Diario</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(gastoPromedioDiario, true)}</p>
                        <p className="text-xs text-gray-400 mt-1">{diasDelPeriodo} días</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-yellow-600" />
                            </div>
                            <span className="text-sm text-gray-500">{month !== null ? 'Total del Mes' : 'Promedio Mensual'}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(gastoPromedioMensual, true)}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <ArrowDownRight className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-sm text-gray-500">Transacciones</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{numeroTransacciones.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">movimientos de egreso</p>
                    </div>
                </div>

                {/* Gráfico de Barras - Cambia según filtro de mes */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {month !== null ? `Gastos por Categoría - ${MONTHS[month]} ${year}` : `Tendencia Mensual de Gastos - ${year}`}
                    </h2>

                    {month === null ? (
                        // Vista anual - barras apiladas por mes
                        <>
                            <div className="flex items-end gap-2 h-72">
                                {MONTHS.map((monthName, idx) => {
                                    const data = tendenciaMensual.monthly[idx];
                                    const heightPercent = (data.total / maxMensual) * 100;

                                    // Calcular alturas proporcionales para cada segmento
                                    const totalHeight = data.total;
                                    const segments = [
                                        ...data.top3Values.map((val, i) => ({
                                            value: val,
                                            height: totalHeight > 0 ? (val / totalHeight) * heightPercent : 0,
                                            color: COLORS[i]
                                        })),
                                        {
                                            value: data.otrosValue,
                                            height: totalHeight > 0 ? (data.otrosValue / totalHeight) * heightPercent : 0,
                                            color: '#9CA3AF'
                                        }
                                    ];

                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div className="w-full flex flex-col items-center justify-end h-60 relative">
                                                {/* Etiqueta de total */}
                                                {data.total > 0 && (
                                                    <span className="text-xs font-medium text-gray-600 mb-1">
                                                        {formatCurrency(data.total, true)}
                                                    </span>
                                                )}
                                                {/* Barra apilada */}
                                                <div
                                                    className="w-full max-w-12 flex flex-col-reverse rounded-t overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                                    style={{ height: `${Math.max(heightPercent, data.total > 0 ? 2 : 0)}%` }}
                                                    onClick={() => setMonth(idx)}
                                                    title={`Ver detalle de ${monthName}`}
                                                >
                                                    {segments.map((seg, segIdx) => (
                                                        seg.value > 0 && (
                                                            <div
                                                                key={segIdx}
                                                                style={{
                                                                    height: `${(seg.value / data.total) * 100}%`,
                                                                    backgroundColor: seg.color
                                                                }}
                                                            />
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-2">{monthName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Leyenda */}
                            <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
                                {tendenciaMensual.top3Categorias.map((cat, idx) => (
                                    <div key={cat} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx] }} />
                                        <span className="text-sm text-gray-600">{cat}</span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-gray-400" />
                                    <span className="text-sm text-gray-600">Otros</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Vista mensual - barras por categoría
                        <div className="space-y-3">
                            {gastosPorCategoriaDelMes.map((cat, idx) => (
                                <div
                                    key={cat.categoria}
                                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                    onClick={() => {
                                        const txs = gastos.filter(tx => (tx.categoria || 'Sin Categoría') === cat.categoria);
                                        openDetail(`Gastos - ${cat.categoria} - ${MONTHS[month]} ${year}`, txs);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-700 truncate flex-1">{cat.categoria}</span>
                                        <span className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(cat.total)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-6 relative overflow-hidden">
                                        <div
                                            className="h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                                            style={{
                                                width: `${(cat.total / maxCategoriaDelMes) * 100}%`,
                                                backgroundColor: COLORS[idx % COLORS.length]
                                            }}
                                        >
                                            {(cat.total / maxCategoriaDelMes) > 0.15 && (
                                                <span className="text-xs font-medium text-white">
                                                    {formatPercent((cat.total / totalGastos) * 100)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {gastosPorCategoriaDelMes.length === 0 && (
                                <p className="text-center text-gray-500 py-8">No hay gastos en este mes</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Top 10 Categorías */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Categorías de Gasto</h2>
                        <div className="space-y-3">
                            {topCategorias.map((cat, idx) => (
                                <div
                                    key={cat.categoria}
                                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                    onClick={() => openDetail(`Gastos - ${cat.categoria}`, cat.transactions)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-700 truncate flex-1">{cat.categoria}</span>
                                        <span className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(cat.total, true)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all"
                                                style={{
                                                    width: `${cat.percent}%`,
                                                    backgroundColor: COLORS[idx % COLORS.length]
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 w-12 text-right">{formatPercent(cat.percent)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gastos por Tipo */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tipo de Gasto</h2>

                        {/* Dona visual */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative w-48 h-48">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {(() => {
                                        let offset = 0;
                                        return gastosPorTipo.map((tipo, idx) => {
                                            const startAngle = offset;
                                            const angle = (tipo.percent / 100) * 360;
                                            const endAngle = startAngle + angle;
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
                                                    key={tipo.tipo}
                                                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={COLORS[idx % COLORS.length]}
                                                    className="hover:opacity-80 cursor-pointer transition-opacity"
                                                    onClick={() => openDetail(`Gastos - ${tipo.tipo}`, tipo.transactions)}
                                                />
                                            );
                                        });
                                    })()}
                                    <circle cx="50" cy="50" r="25" fill="white" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900">{gastosPorTipo.length}</p>
                                        <p className="text-xs text-gray-500">tipos</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lista de tipos */}
                        <div className="space-y-2">
                            {gastosPorTipo.map((tipo, idx) => (
                                <div
                                    key={tipo.tipo}
                                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                    onClick={() => openDetail(`Gastos - ${tipo.tipo}`, tipo.transactions)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                        />
                                        <span className="text-sm text-gray-700">{tipo.tipo}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-900">{formatCurrency(tipo.total, true)}</span>
                                        <span className="text-xs text-gray-500 w-12 text-right">{formatPercent(tipo.percent)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Gastos por Banco */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Banco</h2>
                    <div className="grid grid-cols-5 gap-4">
                        {gastosPorBanco.map((banco) => (
                            <div
                                key={banco.banco}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => openDetail(`Gastos - ${banco.banco}`, banco.transactions)}
                            >
                                <p className="text-sm text-gray-500 truncate">{banco.banco}</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(banco.total, true)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-red-500"
                                            style={{ width: `${banco.percent}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{formatPercent(banco.percent)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detalle por Clasificación */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Detalle por Clasificación</h2>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clasificación / Categoría</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Transacciones</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">% del Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {gastosPorClasificacion.map(clas => {
                                const isExpanded = expandedClasificaciones.has(clas.clasificacion);
                                return (
                                    <React.Fragment key={clas.clasificacion}>
                                        <tr
                                            className="bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                            onClick={() => toggleClasificacion(clas.clasificacion)}
                                        >
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    <span className="font-medium text-gray-900">{clas.clasificacion}</span>
                                                </div>
                                            </td>
                                            <td className="text-right px-6 py-3 text-sm text-gray-600">{clas.count}</td>
                                            <td className="text-right px-6 py-3 text-sm font-semibold text-gray-900">{formatCurrency(clas.total)}</td>
                                            <td className="text-right px-6 py-3 text-sm text-gray-600">{formatPercent(clas.percent)}</td>
                                        </tr>
                                        {isExpanded && clas.categorias.map(cat => (
                                            <tr
                                                key={cat.categoria}
                                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetail(`${clas.clasificacion} - ${cat.categoria}`, cat.transactions);
                                                }}
                                            >
                                                <td className="px-6 py-2 pl-12 text-sm text-gray-600">{cat.categoria}</td>
                                                <td className="text-right px-6 py-2 text-sm text-gray-500">{cat.transactions.length}</td>
                                                <td className="text-right px-6 py-2 text-sm text-gray-700">{formatCurrency(cat.total)}</td>
                                                <td className="text-right px-6 py-2 text-sm text-gray-500">{formatPercent(cat.percent)}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-100 font-semibold">
                            <tr>
                                <td className="px-6 py-3 text-gray-900">TOTAL GASTOS</td>
                                <td className="text-right px-6 py-3 text-gray-900">{numeroTransacciones}</td>
                                <td className="text-right px-6 py-3 text-gray-900">{formatCurrency(totalGastos)}</td>
                                <td className="text-right px-6 py-3 text-gray-900">100%</td>
                            </tr>
                        </tfoot>
                    </table>
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
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Banco</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Descripción</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Categoría</th>
                                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {modalTransactions.sort((a, b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime()).map((tx, idx) => {
                                        const monto = currency === 'COP' ? tx.valorCOP : tx.valorUSD;
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600">{formatDate(tx.fecha)}</td>
                                                <td className="px-4 py-3 text-gray-900">{tx.banco}</td>
                                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{tx.descripcion}</td>
                                                <td className="px-4 py-3 text-gray-600">{tx.categoria}</td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600">
                                                    {formatCurrency(Math.abs(monto))}
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
                                <span className="font-semibold text-red-600">
                                    {formatCurrency(Math.abs(modalTransactions.reduce((sum, tx) => sum + (currency === 'COP' ? tx.valorCOP : tx.valorUSD), 0)))}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}