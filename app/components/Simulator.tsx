'use client';

import React, { useEffect, useState } from 'react';
import {
    RefreshCw,
    Edit3,
    RotateCcw,
    Play,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Target
} from 'lucide-react';

interface SimulatorParams {
    cajaInicial: number;
    activosInicio: number;
    nuevosInicial: number;
    churnInicial: number;
    churnDeltaMes: number;
    churnPiso: number;
    growthInicial: number;
    growthDeltaMes: number;
    growthTecho: number;
    costosFijosBase: number;
    costosFijosDeltaPct: number;
    costosFijosCadaMes: number;
    costoVarCliente: number;
    cacPresupuesto: number;
    precioMes1: number;
    precioMes2: number;
}

interface MesProyectado {
    mes: number;
    mesKey: string;
    mesLabel: string;
    churn: number;
    growth: number;
    costosFijos: number;
    costoVarCliente: number;
    lifetime: number;
    arpu: number;
    margenCliente: number;
    margenBrutoPct: number;
    ltvBruto: number;
    ltvNeto: number;
    cac: number;
    ltvCac: number;
    breakeven: number;
    deficitSuperavit: number;
    activosInicio: number;
    nuevos: number;
    cancelaciones: number;
    activosFin: number;
    mrr: number;
    costoVarTotal: number;
    grossProfit: number;
    netIncome: number;
    netMarginPct: number;
    caja: number;
    burnRate: number;
    runway: number;
    status: 'PROFITABLE' | 'BURNING' | 'BANKRUPT';
}

interface SimulatorResponse {
    success: boolean;
    trm: number;
    mesReferencia: {
        mes: string;
        label: string;
        datos: any;
    };
    parametros: SimulatorParams;
    proyeccion: MesProyectado[];
    conclusiones: {
        mesRentabilidad: number | null;
        mesBreakeven: number | null;
        clientesBreakeven: number;
        mesLtvCacSaludable: number | null;
        runwayInicial: number;
        cajaInicial: number;
        cajaFinal: number;
        alertas: string[];
        resumen: string;
    };
    mesesDisponibles: Array<{ valor: string; label: string }>;
    defaults: Partial<SimulatorParams>;
}

interface Props {
    currency: 'USD' | 'COP';
}

export default function Simulator({ currency }: Props) {
    const [data, setData] = useState<SimulatorResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mesReferencia, setMesReferencia] = useState<string>('');
    const [modoEditar, setModoEditar] = useState(false);
    const [modoPersonalizado, setModoPersonalizado] = useState(false);

    // Parámetros locales para edición
    const [params, setParams] = useState<SimulatorParams>({
        cajaInicial: 0,
        activosInicio: 0,
        nuevosInicial: 0,
        churnInicial: 0,
        churnDeltaMes: -0.05,
        churnPiso: 0.30,
        growthInicial: 0.10,
        growthDeltaMes: 0,
        growthTecho: 0.30,
        costosFijosBase: 0,
        costosFijosDeltaPct: 0.10,
        costosFijosCadaMes: 3,
        costoVarCliente: 0,
        cacPresupuesto: 0,
        precioMes1: 17,
        precioMes2: 50,
    });

    const fetchData = async (customParams?: Partial<SimulatorParams>) => {
        setLoading(true);
        const queryParams = new URLSearchParams();

        if (mesReferencia) queryParams.set('mesReferencia', mesReferencia);

        if (customParams) {
            Object.entries(customParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.set(key, String(value));
                }
            });
        }

        try {
            const url = `/api/simulator?${queryParams.toString()}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                setData(json);
                if (!modoPersonalizado) {
                    setParams(json.parametros);
                    setMesReferencia(json.mesReferencia.mes);
                }
            } else {
                setError(json.error || 'Error al cargar datos');
            }
        } catch (e) {
            setError('Error de conexión');
        }
        setLoading(false);
    };

    useEffect(() => {
        // Solo cargar inicialmente o cuando cambie mesReferencia explícitamente y no estemos en modo personalizado
        // Sin embargo, el cambio de mes referencia debe disparar un fetch limpio
        fetchData();
    }, []);

    const handleMesChange = (nuevoMes: string) => {
        setMesReferencia(nuevoMes);
        setModoPersonalizado(false);
        // fetchData se llamará en el effect o manualmente aquí para asegurar orden
        // Mejor llamarlo directamente para reiniciar estado
        setLoading(true);
        // Hack: update state then fetch
        setTimeout(() => {
            const queryParams = new URLSearchParams();
            queryParams.set('mesReferencia', nuevoMes);
            fetch(`/api/simulator?${queryParams.toString()}`)
                .then(res => res.json())
                .then(json => {
                    if (json.success) {
                        setData(json);
                        setParams(json.parametros);
                        setModoPersonalizado(false);
                    }
                    setLoading(false);
                });
        }, 0);
    };

    const handleParamChange = (key: keyof SimulatorParams, value: any) => {
        const numValue = parseFloat(value);
        setParams(prev => ({ ...prev, [key]: isNaN(numValue) ? 0 : numValue }));
        setModoPersonalizado(true);
    };

    const handleSimular = () => {
        fetchData(params);
        setModoEditar(false); // Opcional: colapsar al simular para ver resultados
    };

    const handleRestaurar = () => {
        if (data?.defaults) {
            setModoPersonalizado(false);
            setMesReferencia(data.mesReferencia.mes); // Resetear al mes actual
            // Recargar datos originales del mes
            const queryParams = new URLSearchParams();
            queryParams.set('mesReferencia', data.mesReferencia.mes);
            setLoading(true);
            fetch(`/api/simulator?${queryParams.toString()}`)
                .then(res => res.json())
                .then(json => {
                    if (json.success) {
                        setData(json);
                        setParams(json.parametros);
                    }
                    setLoading(false);
                });
        }
    };

    // Helpers de formateo
    const formatCurrency = (value: number, compact = false) => {
        let val = value;
        if (currency === 'COP' && data?.trm) {
            val = value * data.trm;
        }

        if (compact) {
            if (currency === 'COP') {
                if (Math.abs(val) >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
                if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
            } else {
                if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
            }
        }

        return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    const formatPercent = (value: number, decimals = 1, showSign = false) => {
        const sign = showSign && value > 0 ? '+' : '';
        return `${sign}${(value * 100).toFixed(decimals)}%`;
    };

    const formatNumber = (value: number, decimals = 0) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-gray-500 font-medium">Cargando simulador...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-800 mb-2">Error en el simulador</h3>
                <p className="text-red-600 mb-6">{error || 'No se pudieron cargar los datos.'}</p>
                <button onClick={() => fetchData()} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                    Reintentar
                </button>
            </div>
        );
    }

    const { conclusiones, proyeccion } = data;

    return (
        <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-500">
            {/* SECCIÓN 1: HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        Simulador Financiero
                        <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider ${modoPersonalizado ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                            {modoPersonalizado ? 'Modo Personalizado' : 'Modo Automático'}
                        </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Proyección a 12 meses basada en datos reales y supuestos editables.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={mesReferencia}
                            onChange={(e) => handleMesChange(e.target.value)}
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-4 pr-10 py-2.5 cursor-pointer hover:bg-white transition-colors font-medium shadow-sm"
                        >
                            {data.mesesDisponibles.map(m => (
                                <option key={m.valor} value={m.valor}>{m.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setModoEditar(!modoEditar)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium transition-colors ${modoEditar
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Edit3 className="w-4 h-4" />
                        {modoEditar ? 'Ocultar Controles' : 'Editar Parámetros'}
                    </button>
                </div>
            </div>

            {/* SECCIÓN 2: CONCLUSIONES */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Rentabilidad */}
                <div className={`p-4 rounded-xl border shadow-sm ${conclusiones.mesRentabilidad ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className={`w-4 h-4 ${conclusiones.mesRentabilidad ? 'text-emerald-600' : 'text-red-500'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${conclusiones.mesRentabilidad ? 'text-emerald-700' : 'text-red-700'}`}>Rentable</span>
                    </div>
                    <p className={`text-lg font-black ${conclusiones.mesRentabilidad ? 'text-emerald-800' : 'text-red-800'}`}>
                        {conclusiones.mesRentabilidad ? `Mes ${conclusiones.mesRentabilidad}` : 'No en 12m'}
                    </p>
                    <p className={`text-xs ${conclusiones.mesRentabilidad ? 'text-emerald-600' : 'text-red-600'}`}>
                        {conclusiones.mesRentabilidad ? proyeccion[conclusiones.mesRentabilidad].mesLabel : 'Necesita ajustes'}
                    </p>
                </div>

                {/* Break-even */}
                <div className={`p-4 rounded-xl border shadow-sm ${conclusiones.mesBreakeven ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Target className={`w-4 h-4 ${conclusiones.mesBreakeven ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${conclusiones.mesBreakeven ? 'text-emerald-700' : 'text-amber-700'}`}>Break-even</span>
                    </div>
                    <p className={`text-lg font-black ${conclusiones.mesBreakeven ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {conclusiones.mesBreakeven ? `Mes ${conclusiones.mesBreakeven}` : 'No alcanzado'}
                    </p>
                    <p className={`text-xs ${conclusiones.mesBreakeven ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatNumber(conclusiones.clientesBreakeven)} clientes
                    </p>
                </div>

                {/* LTV:CAC */}
                <div className={`p-4 rounded-xl border shadow-sm ${conclusiones.mesLtvCacSaludable !== null && conclusiones.mesLtvCacSaludable <= 3 ? 'bg-emerald-50 border-emerald-100' :
                        conclusiones.mesLtvCacSaludable !== null ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Users className={`w-4 h-4 ${conclusiones.mesLtvCacSaludable !== null && conclusiones.mesLtvCacSaludable <= 3 ? 'text-emerald-600' : 'text-amber-600'
                            }`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">LTV:CAC</span>
                    </div>
                    <p className="text-lg font-black text-gray-800">
                        {conclusiones.mesLtvCacSaludable !== null ? `Saludable M${conclusiones.mesLtvCacSaludable}` : 'Bajo < 3x'}
                    </p>
                    <p className="text-xs text-gray-500">
                        Objetivo ≥ 3.0x
                    </p>
                </div>

                {/* Runway */}
                <div className={`p-4 rounded-xl border shadow-sm ${conclusiones.runwayInicial >= 12 ? 'bg-emerald-50 border-emerald-100' :
                        conclusiones.runwayInicial >= 6 ? 'bg-amber-50 border-amber-100' :
                            'bg-red-50 border-red-100'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className={`w-4 h-4 ${conclusiones.runwayInicial >= 12 ? 'text-emerald-600' : 'text-red-600'
                            }`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Runway</span>
                    </div>
                    <p className={`text-lg font-black ${conclusiones.runwayInicial >= 12 ? 'text-emerald-800' :
                            conclusiones.runwayInicial >= 6 ? 'text-amber-800' :
                                'text-red-800'
                        }`}>
                        {conclusiones.runwayInicial >= 99 ? '> 24m' : `${conclusiones.runwayInicial.toFixed(1)} meses`}
                    </p>
                    <p className="text-xs text-gray-500">
                        Actual inicial
                    </p>
                </div>

                {/* Caja Final (M12) */}
                <div className={`p-4 rounded-xl border shadow-sm ${conclusiones.cajaFinal > conclusiones.cajaInicial ? 'bg-emerald-50 border-emerald-100' :
                        conclusiones.cajaFinal > 0 ? 'bg-amber-50 border-amber-100' :
                            'bg-red-50 border-red-100'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Caja M12</span>
                    </div>
                    <p className={`text-lg font-black text-gray-900`}>
                        {formatCurrency(conclusiones.cajaFinal, true)}
                    </p>
                    <p className="text-xs text-gray-500">
                        Proyectada Dic 26
                    </p>
                </div>
            </div>

            {/* SECCIÓN 3: ALERTAS */}
            {conclusiones.alertas.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-amber-800 uppercase flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" /> Alertas del Escenario
                    </h3>
                    <ul className="space-y-1">
                        {conclusiones.alertas.map((alerta, i) => (
                            <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                                <span className="text-amber-500 mt-1.5">•</span>
                                {alerta.replace('⚠️ ', '').replace('🚨 ', '')}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* SECCIÓN 4: PANEL DE CONTROL */}
            {modoEditar && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-gray-900 uppercase tracking-widest">Parámetros del Escenario</h3>
                        {modoPersonalizado && (
                            <button
                                onClick={handleRestaurar}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Restaurar valores originales
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Caja y Usuarios */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-1">Caja y Usuarios</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Caja Inicial ($)</label>
                                    <input
                                        type="number"
                                        value={params.cajaInicial}
                                        onChange={(e) => handleParamChange('cajaInicial', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Clientes Ini</label>
                                    <input
                                        type="number"
                                        value={params.activosInicio}
                                        onChange={(e) => handleParamChange('activosInicio', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Nuevos Ini</label>
                                    <input
                                        type="number"
                                        value={params.nuevosInicial}
                                        onChange={(e) => handleParamChange('nuevosInicial', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Churn */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-1">Churn</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Churn Inicial</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={params.churnInicial}
                                        onChange={(e) => handleParamChange('churnInicial', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Δ Mensual</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={params.churnDeltaMes}
                                        onChange={(e) => handleParamChange('churnDeltaMes', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Negativo reduce churn</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Churn Piso</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={params.churnPiso}
                                        onChange={(e) => handleParamChange('churnPiso', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Crecimiento y Costos */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-1">Crecimiento / Costos</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Growth Ini</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={params.growthInicial}
                                        onChange={(e) => handleParamChange('growthInicial', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Costos Fijos</label>
                                    <input
                                        type="number"
                                        value={params.costosFijosBase}
                                        onChange={(e) => handleParamChange('costosFijosBase', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Pauta Mensual</label>
                                    <input
                                        type="number"
                                        value={params.cacPresupuesto}
                                        onChange={(e) => handleParamChange('cacPresupuesto', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Costo Var/User</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={params.costoVarCliente}
                                        onChange={(e) => handleParamChange('costoVarCliente', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-1">Pricing</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Precio Mes 1</label>
                                    <input
                                        type="number"
                                        value={params.precioMes1}
                                        onChange={(e) => handleParamChange('precioMes1', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Precio Mes 2+</label>
                                    <input
                                        type="number"
                                        value={params.precioMes2}
                                        onChange={(e) => handleParamChange('precioMes2', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={handleSimular}
                                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Play className="w-4 h-4 fill-current" /> Simular Escenario
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN 5: TABLA DE PROYECCIÓN */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Proyección a 12 Meses</h3>
                </div>
                <div className="overflow-x-auto pb-2">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50/30">
                                <th className="text-left py-3 px-4 font-bold text-gray-400 uppercase min-w-[200px] sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Concepto
                                </th>
                                {proyeccion.map((p, i) => (
                                    <th key={p.mes} className={`text-right py-3 px-4 min-w-[100px] font-bold text-gray-400 uppercase ${i === 0 ? 'bg-indigo-50/20' : ''}`}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-300">M{p.mes}</span>
                                            <span className="text-gray-700">{p.mesLabel}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {/* Grupo: Parámetros */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={14} className="py-2 px-4 font-bold text-gray-500 text-[10px] uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Parámetros</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Churn Rate</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.churn <= 0.3 ? 'bg-emerald-50 text-emerald-700' :
                                                p.churn <= 0.5 ? 'bg-amber-50 text-amber-700' :
                                                    'bg-red-50 text-red-700'
                                            }`}>
                                            {formatPercent(p.churn)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Growth (Nuevos)</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {i === 0 ? '-' : formatPercent(p.growth)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Costos Fijos</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-gray-500 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.costosFijos, true)}
                                    </td>
                                ))}
                            </tr>

                            {/* Grupo: Métricas */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={14} className="py-2 px-4 font-bold text-gray-500 text-[10px] uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Métricas Unitarias</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">LTV Neto</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 font-bold text-indigo-600 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.ltvNeto)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">CAC</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-gray-500 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.cac)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">LTV:CAC</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.ltvCac >= 3 ? 'text-emerald-700 bg-emerald-50' :
                                                p.ltvCac >= 1.5 ? 'text-amber-700 bg-amber-50' :
                                                    'text-red-700 bg-red-50'
                                            }`}>
                                            {p.ltvCac > 900 ? '∞' : `${p.ltvCac.toFixed(1)}x`}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Break-even (users)</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-gray-500 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatNumber(p.breakeven)}
                                    </td>
                                ))}
                            </tr>

                            {/* Grupo: Usuarios */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={14} className="py-2 px-4 font-bold text-gray-500 text-[10px] uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Usuarios</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Activos Inicio</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-gray-500 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatNumber(p.activosInicio)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100 text-xs">➕ Nuevos</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-emerald-600 font-medium ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        +{formatNumber(p.nuevos)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100 text-xs">➖ Cancelaciones</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-red-600 font-medium ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatNumber(p.cancelaciones)}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-gray-50/20">
                                <td className="py-2 px-4 font-bold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">Activos Fin</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 font-bold text-gray-900 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatNumber(p.activosFin)}
                                    </td>
                                ))}
                            </tr>

                            {/* Grupo: Financiero */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={14} className="py-2 px-4 font-bold text-gray-500 text-[10px] uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Estado de Resultados</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">MRR</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 font-medium text-gray-800 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.mrr, true)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Gross Profit</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-gray-500 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.grossProfit, true)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-bold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">Net Income</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 font-bold ${p.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'
                                        } ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.netIncome, true)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Net Margin</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 text-xs ${p.netMarginPct >= 0 ? 'text-emerald-600' : 'text-red-500'
                                        } ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatPercent(p.netMarginPct)}
                                    </td>
                                ))}
                            </tr>

                            {/* Grupo: Caja */}
                            <tr className="bg-gray-50/50">
                                <td colSpan={14} className="py-2 px-4 font-bold text-gray-500 text-[10px] uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Caja y Runway</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-bold text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-100">Caja Disponible</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 font-bold text-gray-900 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {formatCurrency(p.caja, true)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Runway (meses)</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 font-medium ${p.runway >= 12 ? 'text-emerald-600' :
                                            p.runway >= 6 ? 'text-amber-600' :
                                                'text-red-600'
                                        } ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        {p.runway > 90 ? '∞' : p.runway.toFixed(1)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r border-gray-100">Status</td>
                                {proyeccion.map((p, i) => (
                                    <td key={p.mes} className={`text-right py-2 px-4 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${p.status === 'PROFITABLE' ? 'bg-emerald-100 text-emerald-800' :
                                                p.status === 'BURNING' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-center text-xs text-gray-300 py-4">
                Fluxi Simulator • Confidential • Proyección estimada, no garantiza resultados futuros.
            </p>
        </div>
    );
}

