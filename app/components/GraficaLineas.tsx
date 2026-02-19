'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { fecha: '01 Dic', saldo: 15000000 },
    { fecha: '05 Dic', saldo: 18000000 },
    { fecha: '10 Dic', saldo: 16500000 },
    { fecha: '15 Dic', saldo: 19000000 },
    { fecha: '20 Dic', saldo: 21000000 },
    { fecha: '25 Dic', saldo: 23500000 },
];

export default function GraficaLineas() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-[#0A2540] mb-4">
                Evolución del Saldo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="fecha"
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
                    <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="#635BFF"
                        strokeWidth={3}
                        dot={{ fill: '#635BFF', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
