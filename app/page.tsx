"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Landmark } from "lucide-react";

interface Transaction {
  banco: string;
  fecha: string;
  descripcion: string;
  naturaleza: 'INGRESO' | 'EGRESO';
  clasificacion: string;
  categoria: string;
  tipo: string;
  valorCOP: number;
  valorUSD: number;
}

interface Summary {
  totalTransactions: number;
  saldoTotalCOP: number;
  saldoTotalUSD: number;
  ingresosCOP: number;
  ingresosUSD: number;
  egresosCOP: number;
  egresosUSD: number;
  aportesCapitalCOP: number;
  aportesCapitalUSD: number;
  saldosPorBancoCOP: Record<string, number>;
  saldosPorBancoUSD: Record<string, number>;
}

interface ApiResponse {
  success: boolean;
  summary: Summary;
  transactions: Transaction[];
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions');
      const result = await response.json();
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number, curr: 'COP' | 'USD' = currency) => {
    if (curr === 'USD') {
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
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
    return dateStr;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando datos...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Error desconocido'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { summary, transactions } = data;
  const saldoTotal = currency === 'COP' ? summary.saldoTotalCOP : summary.saldoTotalUSD;
  const ingresos = currency === 'COP' ? summary.ingresosCOP : summary.ingresosUSD;
  const egresos = currency === 'COP' ? summary.egresosCOP : summary.egresosUSD;
  const aportesCapital = currency === 'COP' ? summary.aportesCapitalCOP : summary.aportesCapitalUSD;
  const saldosPorBanco = currency === 'COP' ? summary.saldosPorBancoCOP : summary.saldosPorBancoUSD;

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Resumen Financiero</h1>
            <p className="text-sm text-gray-500">Vista consolidada de todas las cuentas</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
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
        {/* Saldo Total Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">SALDO TOTAL</p>
          <p className="text-4xl font-semibold text-gray-900">{formatCurrency(saldoTotal)}</p>
          <p className="text-sm text-gray-500 mt-2">{summary.totalTransactions} transacciones</p>
        </div>

        {/* Ingresos, Egresos y Aportes a Capital */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Ingresos</p>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(ingresos)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Egresos</p>
              <p className="text-2xl font-semibold text-red-600">{formatCurrency(egresos)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Landmark className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aportes a Capital</p>
              <p className="text-2xl font-semibold text-blue-600">{formatCurrency(aportesCapital)}</p>
            </div>
          </div>
        </div>

        {/* Saldos por Banco */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Saldos por Banco</h2>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(saldosPorBanco).map(([banco, saldo]) => (
              <div
                key={banco}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">{banco}</p>
                <p className={`text-xl font-semibold ${saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(saldo)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Transacciones */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Últimas Transacciones</h2>
            <a href="/transacciones" className="text-sm text-[#0EA5E9] hover:text-[#0284C7] font-medium">
              Ver todas →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Banco</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.slice(0, 10).map((tx, idx) => {
                  const monto = currency === 'COP' ? tx.valorCOP : tx.valorUSD;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tx.fecha)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{tx.banco}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{tx.descripcion}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${monto >= 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}>
                          {tx.categoria || tx.clasificacion}
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
        </div>
      </div>
    </div>
  );
}