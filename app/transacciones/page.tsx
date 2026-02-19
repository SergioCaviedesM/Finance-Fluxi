"use client";

import { useEffect, useState } from "react";
import { Search, Download, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

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

export default function TransaccionesPage() {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBanco, setFilterBanco] = useState<string>('');
    const [filterNaturaleza, setFilterNaturaleza] = useState<string>('');
    const [filterClasificacion, setFilterClasificacion] = useState<string>('');
    const [filterCategoria, setFilterCategoria] = useState<string>('');
    const [filterFechaInicio, setFilterFechaInicio] = useState<string>('');
    const [filterFechaFin, setFilterFechaFin] = useState<string>('');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(25);

    // Ordenamiento
    const [sortField, setSortField] = useState<string>('fecha');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Opciones únicas para filtros
    const [bancos, setBancos] = useState<string[]>([]);
    const [clasificaciones, setClasificaciones] = useState<string[]>([]);
    const [categorias, setCategorias] = useState<string[]>([]);
    const [naturalezas, setNaturalezas] = useState<string[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/transactions?all=true');
            const result = await response.json();
            if (result.success) {
                setAllTransactions(result.transactions);

                // Extraer opciones únicas para filtros
                const uniqueBancos = [...new Set(result.transactions.map((t: Transaction) => t.banco).filter(Boolean))];
                const uniqueClasificaciones = [...new Set(result.transactions.map((t: Transaction) => t.clasificacion).filter(Boolean))];
                const uniqueCategorias = [...new Set(result.transactions.map((t: Transaction) => t.categoria).filter(Boolean))];
                const uniqueNaturalezas = [...new Set(result.transactions.map((t: Transaction) => t.naturaleza).filter(Boolean))];

                setBancos(uniqueBancos.sort() as string[]);
                setClasificaciones(uniqueClasificaciones.sort() as string[]);
                setCategorias(uniqueCategorias.sort() as string[]);
                setNaturalezas(uniqueNaturalezas.sort() as string[]);
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

    // Aplicar filtros
    useEffect(() => {
        let result = [...allTransactions];

        // Búsqueda por texto
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(tx =>
                tx.descripcion?.toLowerCase().includes(term) ||
                tx.banco?.toLowerCase().includes(term) ||
                tx.categoria?.toLowerCase().includes(term) ||
                tx.clasificacion?.toLowerCase().includes(term)
            );
        }

        // Filtro por banco
        if (filterBanco) {
            result = result.filter(tx => tx.banco === filterBanco);
        }

        // Filtro por naturaleza
        if (filterNaturaleza) {
            result = result.filter(tx => tx.naturaleza === filterNaturaleza);
        }

        // Filtro por clasificación
        if (filterClasificacion) {
            result = result.filter(tx => tx.clasificacion === filterClasificacion);
        }

        // Filtro por categoría
        if (filterCategoria) {
            result = result.filter(tx => tx.categoria === filterCategoria);
        }

        // Filtro por fecha
        if (filterFechaInicio || filterFechaFin) {
            result = result.filter(tx => {
                const txDate = parseDate(tx.fecha);
                if (filterFechaInicio) {
                    const startDate = new Date(filterFechaInicio);
                    if (txDate < startDate) return false;
                }
                if (filterFechaFin) {
                    const endDate = new Date(filterFechaFin);
                    endDate.setHours(23, 59, 59);
                    if (txDate > endDate) return false;
                }
                return true;
            });
        }

        // Ordenamiento
        result.sort((a, b) => {
            let aVal: any = a[sortField as keyof Transaction];
            let bVal: any = b[sortField as keyof Transaction];

            if (sortField === 'fecha') {
                aVal = parseDate(a.fecha).getTime();
                bVal = parseDate(b.fecha).getTime();
            } else if (sortField === 'valorCOP' || sortField === 'valorUSD') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        setFilteredTransactions(result);
        setCurrentPage(1);
    }, [allTransactions, searchTerm, filterBanco, filterNaturaleza, filterClasificacion, filterCategoria, filterFechaInicio, filterFechaFin, sortField, sortDirection]);

    const parseDate = (dateStr: string): Date => {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
    };

    const formatCurrency = (value: number) => {
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

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterBanco('');
        setFilterNaturaleza('');
        setFilterClasificacion('');
        setFilterCategoria('');
        setFilterFechaInicio('');
        setFilterFechaFin('');
    };

    const exportToCSV = () => {
        const headers = ['Fecha', 'Banco', 'Descripción', 'Naturaleza', 'Clasificación', 'Categoría', 'Tipo', 'Valor COP', 'Valor USD'];
        const rows = filteredTransactions.map(tx => [
            tx.fecha,
            tx.banco,
            tx.descripcion,
            tx.naturaleza,
            tx.clasificacion,
            tx.categoria,
            tx.tipo,
            tx.valorCOP,
            tx.valorUSD
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'transacciones.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Paginación
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Cargando transacciones...
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
                        <h1 className="text-2xl font-semibold text-gray-900">Transacciones</h1>
                        <p className="text-sm text-gray-500">{filteredTransactions.length} transacciones encontradas</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchData}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284C7] transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
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

            <div className="p-8 space-y-6">
                {/* Filtros */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="grid grid-cols-7 gap-4">
                        {/* Búsqueda */}
                        <div className="col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent"
                            />
                        </div>

                        {/* Fecha Inicio */}
                        <div>
                            <input
                                type="date"
                                value={filterFechaInicio}
                                onChange={(e) => setFilterFechaInicio(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                            />
                        </div>

                        {/* Fecha Fin */}
                        <div>
                            <input
                                type="date"
                                value={filterFechaFin}
                                onChange={(e) => setFilterFechaFin(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                            />
                        </div>

                        {/* Banco */}
                        <div>
                            <select
                                value={filterBanco}
                                onChange={(e) => setFilterBanco(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                            >
                                <option value="">Todos los bancos</option>
                                {bancos.map(banco => (
                                    <option key={banco} value={banco}>{banco}</option>
                                ))}
                            </select>
                        </div>

                        {/* Clasificación */}
                        <div>
                            <select
                                value={filterClasificacion}
                                onChange={(e) => setFilterClasificacion(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                            >
                                <option value="">Todas las clasificaciones</option>
                                {clasificaciones.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Categoría */}
                        <div>
                            <select
                                value={filterCategoria}
                                onChange={(e) => setFilterCategoria(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Segunda fila de filtros */}
                    <div className="flex items-center gap-4 mt-4">
                        {/* Naturaleza */}
                        <select
                            value={filterNaturaleza}
                            onChange={(e) => setFilterNaturaleza(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
                        >
                            <option value="">Todas las naturalezas</option>
                            {naturalezas.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>

                        {/* Limpiar filtros */}
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-left">
                                    <th
                                        className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('fecha')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Fecha
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('banco')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Banco
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clasificación</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                                    <th
                                        className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort(currency === 'COP' ? 'valorCOP' : 'valorUSD')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Monto
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedTransactions.map((tx, idx) => {
                                    const monto = currency === 'COP' ? tx.valorCOP : tx.valorUSD;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tx.fecha)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{tx.banco}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={tx.descripcion}>
                                                {tx.descripcion}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{tx.clasificacion}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${monto >= 0
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {tx.categoria}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-medium text-right ${monto >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {monto >= 0 ? '+' : ''}{formatCurrency(monto)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-600">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}