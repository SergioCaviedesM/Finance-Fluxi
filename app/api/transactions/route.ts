import { NextResponse } from 'next/server';
import {
    getAllTransactions,
    getTotalsByBank,
    getTotalIngresos,
    getTotalEgresos,
    getTotalAportesCapital,
    getSaldoTotal
} from '../../../lib/sheets';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const all = searchParams.get('all');

        const transactions = await getAllTransactions();

        const summary = {
            totalTransactions: transactions.length,
            saldoTotalCOP: getSaldoTotal(transactions, 'COP'),
            saldoTotalUSD: getSaldoTotal(transactions, 'USD'),
            ingresosCOP: getTotalIngresos(transactions, 'COP'),
            ingresosUSD: getTotalIngresos(transactions, 'USD'),
            egresosCOP: getTotalEgresos(transactions, 'COP'),
            egresosUSD: getTotalEgresos(transactions, 'USD'),
            aportesCapitalCOP: getTotalAportesCapital(transactions, 'COP'),
            aportesCapitalUSD: getTotalAportesCapital(transactions, 'USD'),
            saldosPorBancoCOP: getTotalsByBank(transactions, 'COP'),
            saldosPorBancoUSD: getTotalsByBank(transactions, 'USD'),
        };

        return NextResponse.json({
            success: true,
            summary,
            transactions: all === 'true' ? transactions : transactions.slice(0, 100),
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener datos' },
            { status: 500 }
        );
    }
}