import { NextResponse } from 'next/server';
import {
    getSubscriptions,
    calculateMRR,
    getActiveSubscribers,
    getPastDueSubscribers,
    getSubscriptionsByStatus,
    getSubscriptionsByPlan,
    getMonthlyGrowth,
    getDailyActiveSubscribers,
    getCohortAnalysis,
    getMonthlySubscriberHistory,
    getValidSubscriptions,
} from '@/lib/sheets';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const currency = (searchParams.get('currency') as 'USD' | 'COP') || 'USD';

        const subscriptions = await getSubscriptions();
        const validSubscriptions = getValidSubscriptions(subscriptions);

        const mrr = calculateMRR(subscriptions, currency);
        const activeCount = getActiveSubscribers(subscriptions);
        const pastDueCount = getPastDueSubscribers(subscriptions);
        const byStatus = getSubscriptionsByStatus(subscriptions);
        const byPlan = getSubscriptionsByPlan(subscriptions);
        const monthlyGrowth = getMonthlyGrowth(subscriptions, currency);
        const dailyActive = getDailyActiveSubscribers(subscriptions, currency);
        const cohortAnalysis = getCohortAnalysis(subscriptions);
        const subscriberHistory = getMonthlySubscriberHistory(subscriptions);

        // Churn del último mes completo
        const lastCompleteMonth = monthlyGrowth.length > 1 ? monthlyGrowth[monthlyGrowth.length - 2] : null;
        const churnRate = lastCompleteMonth ? lastCompleteMonth.churnRate : 0;

        // ARPU
        const arpu = activeCount > 0 ? mrr / activeCount : 0;

        // LTV estimado (basado en churn promedio de últimos 6 meses)
        const recentMonths = monthlyGrowth.slice(-6).filter(m => m.activosInicio > 10); // Solo meses con base significativa
        const avgChurn = recentMonths.length > 0
            ? recentMonths.reduce((sum, m) => sum + m.churnRate, 0) / recentMonths.length
            : 0;
        const ltv = avgChurn > 0 ? arpu / (avgChurn / 100) : arpu * 24;

        // Benchmark de churn (5% es el estándar SaaS B2B)
        const churnBenchmark = 5;

        // Últimos 10 cancelados
        const recentCancellations = subscriptions
            .filter(sub => sub.status === 'canceled' && sub.canceledAt)
            .sort((a, b) => new Date(b.canceledAt!).getTime() - new Date(a.canceledAt!).getTime())
            .slice(0, 10)
            .map(sub => ({
                email: sub.customerEmail,
                name: sub.customerName,
                created: sub.created,
                canceledAt: sub.canceledAt,
                plan: sub.planId,
                mrr: sub.amount,
            }));

        // Top 10 más fieles (activos + antigüedad)
        const loyalSubscribers = subscriptions
            .filter(sub => sub.status === 'active')
            .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .slice(0, 10)
            .map(sub => ({
                email: sub.customerEmail,
                name: sub.customerName,
                created: sub.created,
                plan: sub.planId,
                mrr: sub.amount,
                monthsActive: Math.floor((Date.now() - new Date(sub.created).getTime()) / (1000 * 60 * 60 * 24 * 30)),
            }));

        return NextResponse.json({
            success: true,
            currency,
            summary: {
                mrr,
                arr: mrr * 12,
                activeSubscribers: activeCount,
                pastDueSubscribers: pastDueCount,
                churnRate,
                churnBenchmark,
                arpu,
                ltv,
                totalSubscriptions: subscriptions.length,
                validSubscriptions: validSubscriptions.length,
            },
            byStatus,
            byPlan,
            monthlyGrowth,
            dailyActive: dailyActive.slice(-90),
            cohortAnalysis,
            subscriberHistory,
            recentCancellations,
            loyalSubscribers,
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener suscripciones' },
            { status: 500 }
        );
    }
}