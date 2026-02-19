'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { mes: 'Ene', ingresos: 12000000, gastos: 8000000 },
    { mes: 'Feb', ingresos: 15000000, gastos: 9000000 },
    { mes: 'Mar', ingresos: 18000000, gastos: 10000000 },
    { mes: 'Abr', ingresos: 14000000, gastos: 8500000 },
    { mes: 'May', ingresos: 16000000, gastos: 9500000 },
    { mes: 'Jun', ingresos: 20000000, gastos: 11000000 },
];

export default function GraficaBarras() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-[#0A2540] mb-4">
                Ingresos vs Gastos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="mes"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                        formatter={(value: number | undefined) => value ? `$${value.toLocaleString('es-CO')}` : ''}
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                        }}
                    />
                    <Bar dataKey="ingresos" fill="#635BFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" fill="#0A2540" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
