import { NextResponse } from 'next/server';
import {
    getAllTransactions,
    getSalesTransactions,
    getMonthlySales,
    getSalesByCategory,
} from '../../../lib/sheets';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const currency = (searchParams.get('currency') as 'COP' | 'USD') || 'USD';

        const transactions = await getAllTransactions();
        const salesTx = getSalesTransactions(transactions);
        const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';

        const totalSales = salesTx.reduce((sum, tx) => sum + Math.abs(tx[valueKey]), 0);
        const totalTransactions = salesTx.length;
        const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        // Monthly sales data
        const monthlySales = getMonthlySales(transactions, currency);

        // This month vs last month
        const now = new Date();
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

        const salesThisMonth = monthlySales.find(m => m.month === thisMonthKey)?.totalSales || 0;
        const salesLastMonth = monthlySales.find(m => m.month === lastMonthKey)?.totalSales || 0;
        const growthPct = salesLastMonth > 0
            ? Math.round(((salesThisMonth - salesLastMonth) / salesLastMonth) * 10000) / 100
            : 0;

        // Category breakdown
        const salesByCategory = getSalesByCategory(transactions, currency);
        const topCategory = salesByCategory.length > 0 ? salesByCategory[0].categoria : 'N/A';

        // Recent sales (last 15)
        const recentSales = salesTx.slice(0, 15).map(tx => ({
            fecha: tx.fecha,
            descripcion: tx.descripcion,
            banco: tx.banco,
            categoria: tx.categoria || tx.clasificacion || 'Sin categoría',
            tipo: tx.tipo,
            monto: Math.abs(tx[valueKey]),
        }));

        return NextResponse.json({
            success: true,
            summary: {
                totalSales: Math.round(totalSales * 100) / 100,
                totalTransactions,
                avgTicket: Math.round(avgTicket * 100) / 100,
                salesThisMonth: Math.round(salesThisMonth * 100) / 100,
                salesLastMonth: Math.round(salesLastMonth * 100) / 100,
                growthPct,
                topCategory,
            },
            monthlySales,
            salesByCategory,
            recentSales,
        });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener datos de ventas' },
            { status: 500 }
        );
    }
}
