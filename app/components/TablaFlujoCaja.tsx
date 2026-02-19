'use client';

interface Transaction {
    fecha: string;
    descripcion: string;
    monto: number;
    categoria: string;
}

const transactions: Transaction[] = [
    { fecha: '2025-12-01', descripcion: 'Pago nómina', monto: -5000000, categoria: 'Gastos' },
    { fecha: '2025-12-05', descripcion: 'Venta producto A', monto: 8000000, categoria: 'Ingresos' },
    { fecha: '2025-12-10', descripcion: 'Servicios públicos', monto: -500000, categoria: 'Gastos' },
    { fecha: '2025-12-15', descripcion: 'Consultoría', monto: 3000000, categoria: 'Ingresos' },
    { fecha: '2025-12-20', descripcion: 'Compra inventario', monto: -2000000, categoria: 'Gastos' },
];

export default function TablaFlujoCaja() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-[#0A2540] mb-4">
                Flujo de Caja Reciente
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descripción</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Categoría</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((transaction, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-600">
                                    {new Date(transaction.fecha).toLocaleDateString('es-CO', {
                                        day: '2-digit',
                                        month: 'short'
                                    })}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-900">{transaction.descripcion}</td>
                                <td className="py-3 px-4">
                                    <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${transaction.monto > 0
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }
                  `}>
                                        {transaction.categoria}
                                    </span>
                                </td>
                                <td className={`py-3 px-4 text-sm font-semibold text-right ${transaction.monto > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {transaction.monto > 0 ? '+' : ''}${Math.abs(transaction.monto).toLocaleString('es-CO')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
