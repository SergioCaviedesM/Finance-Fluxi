"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, X, RefreshCw } from "lucide-react";

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

interface PivotData {
    [naturaleza: string]: {
        [clasificacion: string]: {
            [categoria: string]: {
                [month: number]: number;
                total: number;
                transactions: Transaction[];
            };
        };
    };
}

interface MonthlyTotals {
    [month: number]: number;
    total: number;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const NATURALEZA_ORDER = ['INGRESO', 'EGRESO', 'TRASLADO'];

export default function FlujoCajaPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [filterBanco, setFilterBanco] = useState<string>('');
    const [bancos, setBancos] = useState<string[]>([]);

    // Estados de expansión
    const [expandedNaturalezas, setExpandedNaturalezas] = useState<Set<string>>(new Set(['INGRESO', 'EGRESO', 'TRASLADO']));
    const [expandedClasificaciones, setExpandedClasificaciones] = useState<Set<string>>(new Set());

    // Modal de detalle
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

                // Extraer años disponibles
                const years = new Set<number>();
                const bancosSet = new Set<string>();
                result.transactions.forEach((tx: Transaction) => {
                    const date = parseDate(tx.fecha);
                    if (date.getFullYear() > 2000) {
                        years.add(date.getFullYear());
                    }
                    if (tx.banco) {
                        bancosSet.add(tx.banco);
                    }
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

    const formatCurrency = (value: number) => {
        const absValue = Math.abs(value);
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

    // Filtrar transacciones por año y banco
    const filteredTransactions = transactions.filter(tx => {
        const date = parseDate(tx.fecha);
        const matchYear = date.getFullYear() === year;
        const matchBanco = filterBanco ? tx.banco === filterBanco : true;
        return matchYear && matchBanco;
    });

    // Construir datos de pivot
    const buildPivotData = (): PivotData => {
        const pivot: PivotData = {};
        const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';

        filteredTransactions.forEach(tx => {
            const naturaleza = tx.naturaleza || 'SIN NATURALEZA';
            const clasificacion = tx.clasificacion || 'Sin Clasificación';
            const categoria = tx.categoria || 'Sin Categoría';
            const date = parseDate(tx.fecha);
            const month = date.getMonth();
            const value = tx[valueKey];

            if (!pivot[naturaleza]) pivot[naturaleza] = {};
            if (!pivot[naturaleza][clasificacion]) pivot[naturaleza][clasificacion] = {};
            if (!pivot[naturaleza][clasificacion][categoria]) {
                pivot[naturaleza][clasificacion][categoria] = {
                    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0,
                    total: 0,
                    transactions: []
                };
            }

            pivot[naturaleza][clasificacion][categoria][month] += value;
            pivot[naturaleza][clasificacion][categoria].total += value;
            pivot[naturaleza][clasificacion][categoria].transactions.push(tx);
        });

        return pivot;
    };

    const pivotData = buildPivotData();

    // Ordenar naturalezas según el orden definido
    const sortedNaturalezas = Object.keys(pivotData).sort((a, b) => {
        const indexA = NATURALEZA_ORDER.indexOf(a);
        const indexB = NATURALEZA_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    // Calcular totales por clasificación
    const getClasificacionTotals = (naturaleza: string, clasificacion: string): MonthlyTotals => {
        const totals: MonthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, total: 0 };
        const categorias = pivotData[naturaleza]?.[clasificacion] || {};

        Object.values(categorias).forEach(cat => {
            for (let m = 0; m < 12; m++) {
                totals[m] += cat[m] || 0;
            }
            totals.total += cat.total || 0;
        });

        return totals;
    };

    // Calcular totales por naturaleza
    const getNaturalezaTotals = (naturaleza: string): MonthlyTotals => {
        const totals: MonthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, total: 0 };
        const clasificaciones = pivotData[naturaleza] || {};

        Object.keys(clasificaciones).forEach(clas => {
            const clasTotals = getClasificacionTotals(naturaleza, clas);
            for (let m = 0; m < 12; m++) {
                totals[m] += clasTotals[m] || 0;
            }
            totals.total += clasTotals.total || 0;
        });

        return totals;
    };

    // Calcular flujo neto por mes
    const getNetFlow = (): MonthlyTotals => {
        const totals: MonthlyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, total: 0 };

        Object.keys(pivotData).forEach(naturaleza => {
            const natTotals = getNaturalezaTotals(naturaleza);
            for (let m = 0; m < 12; m++) {
                totals[m] += natTotals[m] || 0;
            }
            totals.total += natTotals.total || 0;
        });

        return totals;
    };

    const toggleNaturaleza = (nat: string) => {
        const newSet = new Set(expandedNaturalezas);
        if (newSet.has(nat)) {
            newSet.delete(nat);
        } else {
            newSet.add(nat);
        }
        setExpandedNaturalezas(newSet);
    };

    const toggleClasificacion = (clas: string) => {
        const newSet = new Set(expandedClasificaciones);
        if (newSet.has(clas)) {
            newSet.delete(clas);
        } else {
            newSet.add(clas);
        }
        setExpandedClasificaciones(newSet);
    };

    const openDetail = (title: string, txs: Transaction[]) => {
        setModalTitle(title);
        setModalTransactions(txs);
        setModalOpen(true);
    };

    const getTransactionsForCell = (naturaleza: string, clasificacion: string, categoria: string, month: number): Transaction[] => {
        return pivotData[naturaleza]?.[clasificacion]?.[categoria]?.transactions.filter(tx => {
            const date = parseDate(tx.fecha);
            return date.getMonth() === month;
        }) || [];
    };

    const getCellValue = (value: number) => {
        if (value === 0) return '-';
        return formatCurrency(value);
    };

    const getCellClass = (value: number) => {
        if (value === 0) return 'text-gray-300';
        if (value > 0) return 'text-green-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando flujo de caja...
                </div>
            </div>
        );
    }

    const netFlow = getNetFlow();

    return (
        <div className="min-h-screen bg-[#F7F7F8]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Flujo de Caja</h1>
                        <p className="text-sm text-gray-500">
                            Vista consolidada por categorías - {year}
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

                        {/* Filtro de banco */}
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

                        {/* Selector de año */}
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        {/* Toggle moneda */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setCurrency('COP')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'COP'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                COP
                            </button>
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === 'USD'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                USD
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-8">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-200px)]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-gray-50">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[280px] border-r border-gray-200 z-30">
                                        Categoría
                                    </th>
                                    {MONTHS.map((month, idx) => (
                                        <th key={idx} className="text-right px-3 py-3 font-semibold text-gray-700 min-w-[100px] bg-gray-50">
                                            {month}
                                        </th>
                                    ))}
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700 min-w-[120px] bg-gray-100">
                                        TOTAL
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Filas por naturaleza - ordenadas */}
                                {sortedNaturalezas.map(naturaleza => {
                                    const natTotals = getNaturalezaTotals(naturaleza);
                                    const isNatExpanded = expandedNaturalezas.has(naturaleza);

                                    return (
                                        <React.Fragment key={naturaleza}>
                                            {/* Fila de Naturaleza */}
                                            <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                                                <td
                                                    className="px-4 py-3 sticky left-0 bg-gray-100 border-r border-gray-200 cursor-pointer hover:bg-gray-200 z-10"
                                                    onClick={() => toggleNaturaleza(naturaleza)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isNatExpanded ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                        {naturaleza}
                                                    </div>
                                                </td>
                                                {MONTHS.map((_, idx) => (
                                                    <td key={idx} className={`text-right px-3 py-3 ${getCellClass(natTotals[idx])}`}>
                                                        {getCellValue(natTotals[idx])}
                                                    </td>
                                                ))}
                                                <td className={`text-right px-4 py-3 bg-gray-200 font-bold ${getCellClass(natTotals.total)}`}>
                                                    {getCellValue(natTotals.total)}
                                                </td>
                                            </tr>

                                            {/* Clasificaciones dentro de naturaleza */}
                                            {isNatExpanded && Object.keys(pivotData[naturaleza]).sort().map(clasificacion => {
                                                const clasTotals = getClasificacionTotals(naturaleza, clasificacion);
                                                const isClasExpanded = expandedClasificaciones.has(`${naturaleza}-${clasificacion}`);

                                                return (
                                                    <React.Fragment key={clasificacion}>
                                                        {/* Fila de Clasificación */}
                                                        <tr className="bg-gray-50 border-t border-gray-100">
                                                            <td
                                                                className="px-4 py-2 pl-8 sticky left-0 bg-gray-50 border-r border-gray-200 cursor-pointer hover:bg-gray-100 z-10"
                                                                onClick={() => toggleClasificacion(`${naturaleza}-${clasificacion}`)}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {isClasExpanded ? (
                                                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                                                    )}
                                                                    <span className="font-medium text-gray-700">{clasificacion}</span>
                                                                </div>
                                                            </td>
                                                            {MONTHS.map((_, idx) => (
                                                                <td key={idx} className={`text-right px-3 py-2 ${getCellClass(clasTotals[idx])}`}>
                                                                    {getCellValue(clasTotals[idx])}
                                                                </td>
                                                            ))}
                                                            <td className={`text-right px-4 py-2 bg-gray-100 font-semibold ${getCellClass(clasTotals.total)}`}>
                                                                {getCellValue(clasTotals.total)}
                                                            </td>
                                                        </tr>

                                                        {/* Categorías dentro de clasificación */}
                                                        {isClasExpanded && Object.keys(pivotData[naturaleza][clasificacion]).sort().map(categoria => {
                                                            const catData = pivotData[naturaleza][clasificacion][categoria];

                                                            return (
                                                                <tr key={categoria} className="border-t border-gray-50 hover:bg-blue-50 transition-colors">
                                                                    <td className="px-4 py-2 pl-14 sticky left-0 bg-white border-r border-gray-200 text-gray-600 z-10 hover:bg-blue-50">
                                                                        {categoria}
                                                                    </td>
                                                                    {MONTHS.map((monthName, idx) => {
                                                                        const value = catData[idx] || 0;
                                                                        const cellTxs = getTransactionsForCell(naturaleza, clasificacion, categoria, idx);

                                                                        return (
                                                                            <td
                                                                                key={idx}
                                                                                className={`text-right px-3 py-2 ${getCellClass(value)} ${value !== 0 ? 'cursor-pointer hover:bg-blue-100' : ''}`}
                                                                                onClick={() => {
                                                                                    if (value !== 0 && cellTxs.length > 0) {
                                                                                        openDetail(`${categoria} - ${monthName} ${year}`, cellTxs);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {getCellValue(value)}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td
                                                                        className={`text-right px-4 py-2 bg-gray-50 ${getCellClass(catData.total)} ${catData.total !== 0 ? 'cursor-pointer hover:bg-blue-100' : ''}`}
                                                                        onClick={() => {
                                                                            if (catData.total !== 0) {
                                                                                openDetail(`${categoria} - ${year}`, catData.transactions);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {getCellValue(catData.total)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Fila de Flujo Neto */}
                                <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                                    <td className="px-4 py-3 sticky left-0 bg-blue-50 border-r border-blue-200 text-blue-900 z-10">
                                        FLUJO NETO
                                    </td>
                                    {MONTHS.map((_, idx) => (
                                        <td key={idx} className={`text-right px-3 py-3 ${getCellClass(netFlow[idx])}`}>
                                            {getCellValue(netFlow[idx])}
                                        </td>
                                    ))}
                                    <td className={`text-right px-4 py-3 bg-blue-100 ${getCellClass(netFlow.total)}`}>
                                        {getCellValue(netFlow.total)}
                                    </td>
                                </tr>
                            </tbody>
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
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Banco</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Descripción</th>
                                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {modalTransactions.map((tx, idx) => {
                                        const monto = currency === 'COP' ? tx.valorCOP : tx.valorUSD;
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600">{formatDate(tx.fecha)}</td>
                                                <td className="px-4 py-3 text-gray-900">{tx.banco}</td>
                                                <td className="px-4 py-3 text-gray-600">{tx.descripcion}</td>
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
                                <span className={getCellClass(modalTransactions.reduce((sum, tx) => sum + (currency === 'COP' ? tx.valorCOP : tx.valorUSD), 0))}>
                                    {formatCurrency(modalTransactions.reduce((sum, tx) => sum + (currency === 'COP' ? tx.valorCOP : tx.valorUSD), 0))}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}