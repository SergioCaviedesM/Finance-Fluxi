/**
 * Datos mock realistas para el dashboard Fluxi
 */

export type Currency = 'COP' | 'USD';

export interface Bank {
    id: string;
    name: string;
    shortName: string;
}

export interface Transaction {
    id: string;
    fecha: Date;
    banco: string;
    descripcion: string;
    clasificacion: string;
    categoria: string;
    naturaleza: 'INGRESO' | 'EGRESO';
    montoCOP: number;
    montoUSD: number;
    tipo: string;
}

export interface Balance {
    banco: string;
    saldoCOP: number;
    saldoUSD: number;
    historico: number[]; // Para sparklines
}

// Bancos
export const BANKS: Bank[] = [
    { id: 'stripe-fluxi', name: 'Stripe - Fluxi', shortName: 'Stripe' },
    { id: 'mercury-fluxi', name: 'Mercury - Fluxi', shortName: 'Mercury' },
    { id: 'bancolombia', name: 'Bancolombia', shortName: 'Bancolombia' },
    { id: 'bancolombia-fic', name: 'Bancolombia FIC', shortName: 'BNC FIC' },
    { id: 'mercury-neuro', name: 'Mercury - Neuro', shortName: 'Mercury N' },
];

// Clasificaciones y Categorías
export const CLASIFICACIONES = {
    INGRESOS: ['Ventas', 'Otros Ingresos', 'Inversiones'],
    GASTOS: ['Nómina', 'Proveedores', 'Pauta', 'Plataformas', 'Servicios', 'Impuestos', 'Otros Gastos'],
};

export const CATEGORIAS: Record<string, string[]> = {
    'Ventas': ['Producto A', 'Producto B', 'Servicios', 'Suscripciones'],
    'Otros Ingresos': ['Intereses', 'Devoluciones', 'Reembolsos'],
    'Nómina': ['Salarios', 'Prestaciones', 'Bonificaciones'],
    'Proveedores': ['Inventario', 'Materias Primas', 'Mercancía'],
    'Pauta': ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'TikTok Ads'],
    'Plataformas': ['AWS', 'Shopify', 'Stripe Fees', 'Google Workspace'],
    'Servicios': ['Contador', 'Abogado', 'Consultoría', 'Servicios Públicos'],
    'Impuestos': ['IVA', 'Renta', 'ICA', 'Retefuente'],
};

export const TIPOS = [
    'INGRESOS',
    'GASTOS',
    'COSTOS FIJOS',
    'COSTOS VARIABLES',
    'TRASLADOS',
    'IMPUESTOS',
];

// Saldos por banco
export const BALANCES: Balance[] = [
    {
        banco: 'Stripe - Fluxi',
        saldoCOP: 45680000,
        saldoUSD: 11200,
        historico: [10800, 11000, 10900, 11100, 11050, 11200, 11150, 11200],
    },
    {
        banco: 'Mercury - Fluxi',
        saldoCOP: 246482000,
        saldoUSD: 60385,
        historico: [58000, 59000, 59500, 60000, 60200, 60385, 60300, 60385],
    },
    {
        banco: 'Bancolombia',
        saldoCOP: 181968000,
        saldoUSD: 44577,
        historico: [42000, 43000, 43500, 44000, 44200, 44400, 44500, 44577],
    },
    {
        banco: 'Bancolombia FIC',
        saldoCOP: 3706000,
        saldoUSD: 908,
        historico: [850, 870, 890, 900, 905, 908, 907, 908],
    },
    {
        banco: 'Mercury - Neuro',
        saldoCOP: 60807000,
        saldoUSD: 14904,
        historico: [14000, 14200, 14400, 14600, 14700, 14800, 14850, 14904],
    },
];

// Transacciones mock (últimos 3 meses)
function generateTransactions(): Transaction[] {
    const transactions: Transaction[] = [];
    const today = new Date();

    const mockData = [
        // Ingresos
        { banco: 'Stripe - Fluxi', desc: 'Venta Producto A', clasif: 'Ventas', cat: 'Producto A', monto: 8500000, nat: 'INGRESO' as const },
        { banco: 'Stripe - Fluxi', desc: 'Suscripción mensual', clasif: 'Ventas', cat: 'Suscripciones', monto: 3200000, nat: 'INGRESO' as const },
        { banco: 'Mercury - Fluxi', desc: 'Venta internacional', clasif: 'Ventas', cat: 'Producto B', monto: 15000000, nat: 'INGRESO' as const },
        { banco: 'Bancolombia', desc: 'Pago cliente corporativo', clasif: 'Ventas', cat: 'Servicios', monto: 12000000, nat: 'INGRESO' as const },

        // Gastos - Nómina
        { banco: 'Bancolombia', desc: 'Pago nómina mensual', clasif: 'Nómina', cat: 'Salarios', monto: -25000000, nat: 'EGRESO' as const },
        { banco: 'Bancolombia', desc: 'Prestaciones sociales', clasif: 'Nómina', cat: 'Prestaciones', monto: -8500000, nat: 'EGRESO' as const },

        // Gastos - Pauta
        { banco: 'Mercury - Fluxi', desc: 'Campaña Google Ads', clasif: 'Pauta', cat: 'Google Ads', monto: -4200000, nat: 'EGRESO' as const },
        { banco: 'Mercury - Fluxi', desc: 'Anuncios Meta', clasif: 'Pauta', cat: 'Meta Ads', monto: -3800000, nat: 'EGRESO' as const },
        { banco: 'Stripe - Fluxi', desc: 'LinkedIn Ads', clasif: 'Pauta', cat: 'LinkedIn Ads', monto: -1500000, nat: 'EGRESO' as const },

        // Gastos - Plataformas
        { banco: 'Mercury - Fluxi', desc: 'AWS Hosting', clasif: 'Plataformas', cat: 'AWS', monto: -2100000, nat: 'EGRESO' as const },
        { banco: 'Stripe - Fluxi', desc: 'Shopify - Plan mensual', clasif: 'Plataformas', cat: 'Shopify', monto: -850000, nat: 'EGRESO' as const },
        { banco: 'Stripe - Fluxi', desc: 'Comisiones Stripe', clasif: 'Plataformas', cat: 'Stripe Fees', monto: -650000, nat: 'EGRESO' as const },
        { banco: 'Mercury - Fluxi', desc: 'Google Workspace', clasif: 'Plataformas', cat: 'Google Workspace', monto: -280000, nat: 'EGRESO' as const },

        // Gastos - Servicios
        { banco: 'Bancolombia', desc: 'Honorarios contador', clasif: 'Servicios', cat: 'Contador', monto: -2500000, nat: 'EGRESO' as const },
        { banco: 'Bancolombia', desc: 'Servicios públicos oficina', clasif: 'Servicios', cat: 'Servicios Públicos', monto: -850000, nat: 'EGRESO' as const },
        { banco: 'Bancolombia', desc: 'Consultoría legal', clasif: 'Servicios', cat: 'Abogado', monto: -3200000, nat: 'EGRESO' as const },

        // Gastos - Proveedores
        { banco: 'Bancolombia', desc: 'Compra inventario', clasif: 'Proveedores', cat: 'Inventario', monto: -18000000, nat: 'EGRESO' as const },
        { banco: 'Bancolombia FIC', desc: 'Materias primas', clasif: 'Proveedores', cat: 'Materias Primas', monto: -9500000, nat: 'EGRESO' as const },

        // Impuestos
        { banco: 'Bancolombia', desc: 'Pago IVA', clasif: 'Impuestos', cat: 'IVA', monto: -5200000, nat: 'EGRESO' as const },
        { banco: 'Bancolombia', desc: 'Retención en la fuente', clasif: 'Impuestos', cat: 'Retefuente', monto: -1800000, nat: 'EGRESO' as const },
    ];

    // Generar transacciones para los últimos 90 días
    for (let i = 0; i < 90; i++) {
        const fecha = new Date(today);
        fecha.setDate(fecha.getDate() - i);

        // Agregar 2-4 transacciones por día
        const numTrans = Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < numTrans; j++) {
            const template = mockData[Math.floor(Math.random() * mockData.length)];
            const variation = 0.7 + Math.random() * 0.6; // Variación 70%-130%

            transactions.push({
                id: `trans-${i}-${j}`,
                fecha,
                banco: template.banco,
                descripcion: template.desc,
                clasificacion: template.clasif,
                categoria: template.cat,
                naturaleza: template.nat,
                montoCOP: Math.round(template.monto * variation),
                montoUSD: Math.round((template.monto * variation) / 4100),
                tipo: template.nat === 'INGRESO' ? 'INGRESOS' : 'GASTOS',
            });
        }
    }

    return transactions.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

export const TRANSACTIONS = generateTransactions();

// Helper functions
export function getTransactionsByBank(banco: string): Transaction[] {
    return TRANSACTIONS.filter(t => t.banco === banco);
}

export function getTransactionsByDateRange(start: Date, end: Date): Transaction[] {
    return TRANSACTIONS.filter(t => t.fecha >= start && t.fecha <= end);
}

export function getTotalByNaturaleza(naturaleza: 'INGRESO' | 'EGRESO', currency: Currency = 'COP'): number {
    const field = currency === 'COP' ? 'montoCOP' : 'montoUSD';
    return TRANSACTIONS
        .filter(t => t.naturaleza === naturaleza)
        .reduce((sum, t) => sum + Math.abs(t[field]), 0);
}

export function getTotalBalance(currency: Currency = 'COP'): number {
    const field = currency === 'COP' ? 'saldoCOP' : 'saldoUSD';
    return BALANCES.reduce((sum, b) => sum + b[field], 0);
}

export function getBalanceHistory(): number[] {
    // Combinar históricos para gráfica de saldo total
    const length = BALANCES[0].historico.length;
    const combined = [];

    for (let i = 0; i < length; i++) {
        const total = BALANCES.reduce((sum, b) => sum + (b.historico[i] || 0), 0);
        combined.push(total);
    }

    return combined;
}
