import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAMES = ['Stripe', 'Bancolombia', 'FIC', 'Mercury', 'Mercury - Neuro'];

function getAuthClient(): JWT {
    return new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}

function parseDate(val: any): Date | null {
    if (!val) return null;
    if (typeof val === 'string' && val.includes('/')) {
        const parts = val.split(' ')[0].split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
}

function parseNumber(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const withDot = val.toString().replace(',', '.');
    const cleaned = withDot.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
}

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const meses: Record<string, string> = {
        '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    return `${meses[month]} ${year?.slice(2)}`;
}

interface MonthlyMetrics {
    mes: string;
    mesLabel: string;
    activosInicio: number;
    nuevos: number;
    cancelaciones: number;
    activosFin: number;
    churnRate: number;
    revenue: number;
    pagos: number;
    arpu: number;
    lifetime: number;
    ltv: number;
    pauta: number;
    cac: number;
    ltvCacRatio: number;
    costoVariable: number;
    costoVariablePorCliente: number;
    margenBruto: number;
    margenBrutoPct: number;
    paybackMeses: number;
}

interface Analisis {
    estado: 'HEALTHY' | 'ON_TRACK' | 'AT_RISK';
    estadoLabel: string;
    resumenEjecutivo: string;
    hallazgos: string[];
    riesgos: string[];
    recomendaciones: string[];
}

interface Financials {
    grossProfit: number;
    netIncome: number;
    netMarginPct: number;
    burnRate: number;
    runway: number;
    costosFijos: number;
    cajaAlCierre: number;
}

function generarAnalisis(metricas: MonthlyMetrics[], mesSeleccionado: MonthlyMetrics, mesAnterior: MonthlyMetrics | null): Analisis {
    const ltvCac = mesSeleccionado.ltvCacRatio;
    const churn = mesSeleccionado.churnRate;
    const payback = mesSeleccionado.paybackMeses;
    const mesLabel = mesSeleccionado.mesLabel;

    // Determinar estado (en inglés)
    let estado: 'HEALTHY' | 'ON_TRACK' | 'AT_RISK';
    let estadoLabel: string;

    if (ltvCac >= 3 && churn < 30 && payback < 6) {
        estado = 'HEALTHY';
        estadoLabel = 'Healthy';
    } else if ((ltvCac >= 1.5 && ltvCac < 100) || churn < 50) {
        estado = 'ON_TRACK';
        estadoLabel = 'On Track';
    } else {
        estado = 'AT_RISK';
        estadoLabel = 'At Risk';
    }

    // Resumen ejecutivo (tono junta directiva)
    let resumenEjecutivo: string;

    if (estado === 'HEALTHY') {
        resumenEjecutivo = `En ${mesLabel}, la compañía presenta unit economics saludables con un LTV:CAC de ${ltvCac.toFixed(1)}x, superando el benchmark de 3x. El modelo de adquisición es sostenible y permite escalar la inversión en pauta.`;
    } else if (estado === 'ON_TRACK') {
        resumenEjecutivo = `En ${mesLabel}, la compañía presenta un LTV:CAC de ${ltvCac.toFixed(1)}x con un CAC de $${mesSeleccionado.cac.toFixed(0)} y LTV de $${mesSeleccionado.ltv.toFixed(0)}. El modelo muestra señales positivas pero requiere optimización en retención para alcanzar sostenibilidad.`;
    } else {
        resumenEjecutivo = `En ${mesLabel}, los unit economics presentan riesgo con un churn del ${churn.toFixed(0)}% que limita el LTV a $${mesSeleccionado.ltv.toFixed(0)}. Se requiere acción inmediata en estrategias de retención antes de escalar adquisición.`;
    }

    // Hallazgos (datos objetivos)
    const hallazgos: string[] = [];

    hallazgos.push(`La inversión en pauta fue de $${mesSeleccionado.pauta.toFixed(0)} USD, adquiriendo ${mesSeleccionado.nuevos} clientes nuevos (CAC: $${mesSeleccionado.cac.toFixed(0)}).`);

    hallazgos.push(`El revenue del mes fue $${mesSeleccionado.revenue.toFixed(0)} USD con ${mesSeleccionado.pagos} pagos procesados (ARPU: $${mesSeleccionado.arpu.toFixed(0)}).`);

    if (mesAnterior) {
        const deltaChurn = mesSeleccionado.churnRate - mesAnterior.churnRate;
        const direccion = deltaChurn > 0 ? 'incrementó' : 'disminuyó';
        hallazgos.push(`El churn ${direccion} de ${mesAnterior.churnRate.toFixed(1)}% a ${mesSeleccionado.churnRate.toFixed(1)}% respecto al mes anterior.`);

        if (mesAnterior.cac > 0) {
            const deltaCac = ((mesSeleccionado.cac - mesAnterior.cac) / mesAnterior.cac) * 100;
            const direccionCac = deltaCac > 0 ? 'aumentó' : 'disminuyó';
            hallazgos.push(`El CAC ${direccionCac} ${Math.abs(deltaCac).toFixed(0)}% ($${mesAnterior.cac.toFixed(0)} → $${mesSeleccionado.cac.toFixed(0)}).`);
        }
    }

    hallazgos.push(`El lifetime promedio es de ${mesSeleccionado.lifetime.toFixed(1)} meses, generando un LTV de $${mesSeleccionado.ltv.toFixed(0)} por cliente.`);

    // Riesgos
    const riesgos: string[] = [];

    if (churn > 50) {
        riesgos.push(`Churn crítico del ${churn.toFixed(0)}%. Más de la mitad de la base de clientes se pierde mensualmente, limitando severamente el LTV.`);
    } else if (churn > 30) {
        riesgos.push(`Churn elevado del ${churn.toFixed(0)}%. El benchmark para SaaS B2B es menor al 30% mensual.`);
    }

    if (ltvCac < 3 && ltvCac > 0) {
        riesgos.push(`LTV:CAC de ${ltvCac.toFixed(1)}x está por debajo del benchmark de 3x. Cada cliente no genera suficiente valor para justificar el costo de adquisición.`);
    }

    if (payback > 6 && mesSeleccionado.cac > 0) {
        riesgos.push(`Payback period de ${payback.toFixed(1)} meses excede el máximo recomendado de 6 meses.`);
    }

    if (mesSeleccionado.lifetime < 2) {
        riesgos.push(`Lifetime de ${mesSeleccionado.lifetime.toFixed(1)} meses indica que los clientes abandonan antes de completar su segundo mes.`);
    }

    if (riesgos.length === 0) {
        riesgos.push('No se identificaron riesgos críticos en el período analizado.');
    }

    // Recomendaciones
    const recomendaciones: string[] = [];

    if (churn > 40) {
        const ltvOptimizado = mesSeleccionado.arpu * (1 / 0.3);
        recomendaciones.push(`Priorizar reducción de churn. Una disminución al 30% elevaría el LTV de $${mesSeleccionado.ltv.toFixed(0)} a $${ltvOptimizado.toFixed(0)} (+${((ltvOptimizado / mesSeleccionado.ltv - 1) * 100).toFixed(0)}%).`);
    }

    if (ltvCac >= 3 || (mesSeleccionado.cac < 20 && mesSeleccionado.ltv > 50)) {
        const maxCac = mesSeleccionado.ltv / 3;
        recomendaciones.push(`El LTV:CAC permite incrementar inversión en adquisición. CAC máximo recomendado: $${maxCac.toFixed(0)} por cliente manteniendo ratio 3x.`);
    }

    if (mesSeleccionado.margenBrutoPct < 60) {
        recomendaciones.push(`Revisar estructura de costos variables. Margen bruto de ${mesSeleccionado.margenBrutoPct.toFixed(0)}% está por debajo del benchmark de 60% para SaaS.`);
    }

    if (recomendaciones.length === 0) {
        recomendaciones.push(`Mantener estrategia actual y monitorear métricas de retención para asegurar sostenibilidad del modelo.`);
    }

    return {
        estado,
        estadoLabel,
        resumenEjecutivo,
        hallazgos: hallazgos.slice(0, 5),
        riesgos: riesgos.slice(0, 3),
        recomendaciones: recomendaciones.slice(0, 3)
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mesSeleccionadoParam = searchParams.get('mes'); // Formato: 2026-01

        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Obtener datos de Stripe (Revenue)
        const stripeResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Stripe!A:N',
        });
        const stripeRows = stripeResponse.data.values || [];

        // 2. Obtener datos de Suscriptores
        const subsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Suscriptores!A:O',
        });
        const subsRows = subsResponse.data.values || [];

        // 3. Obtener TODAS las transacciones consolidadas
        const allTransactions: Array<{
            fecha: Date;
            clasificacion: string;
            tipo: string;
            valorUSD: number;      // Valor absoluto para cálculos de pauta/costos
            valorUSDConSigno: number;  // Valor con signo para saldo
        }> = [];

        for (const sheetName of SHEET_NAMES) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: SHEET_ID,
                    range: `${sheetName}!A:Z`,
                });
                const rows = response.data.values || [];
                if (rows.length < 2) continue;

                const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim() || '');
                const fechaIdx = headers.findIndex((h: string) => h === 'fecha');
                const clasifIdx = headers.findIndex((h: string) => h.includes('clasif'));
                const tipoIdx = headers.findIndex((h: string) => h === 'tipo');
                const valorUsdIdx = headers.findIndex((h: string) => h.includes('valor_usd'));
                const proyectoIdx = headers.findIndex((h: string) => h === 'proyecto');

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row) continue;

                    // Filtrar solo FLUXI en Mercury - Neuro
                    if (sheetName === 'Mercury - Neuro') {
                        const proyecto = row[proyectoIdx]?.toString().toUpperCase() || '';
                        if (proyecto !== 'FLUXI') continue;
                    }

                    const fecha = parseDate(row[fechaIdx]);
                    if (!fecha) continue;

                    const valorConSigno = parseNumber(row[valorUsdIdx]);

                    allTransactions.push({
                        fecha,
                        clasificacion: row[clasifIdx]?.toString() || '',
                        tipo: row[tipoIdx]?.toString() || '',
                        valorUSD: Math.abs(valorConSigno),
                        valorUSDConSigno: valorConSigno
                    });
                }
            } catch (error) {
                console.error(`Error fetching ${sheetName}:`, error);
            }
        }

        // 4. Obtener TRM
        const trmResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Dólar!A:B',
        });
        const trmRows = trmResponse.data.values || [];
        let trm = 4000;
        for (let i = trmRows.length - 1; i >= 1; i--) {
            const row = trmRows[i];
            if (row && row[1]) {
                trm = parseNumber(row[1]);
                break;
            }
        }

        // Procesar Stripe - Revenue por mes
        const revenueByMonth: Record<string, { revenue: number; pagos: number }> = {};
        const stripeHeaders = stripeRows[0]?.map((h: string) => h?.toLowerCase().trim()) || [];
        const stripeDescIdx = stripeHeaders.findIndex((h: string) => h.includes('descripcion'));
        const stripeFechaIdx = stripeHeaders.findIndex((h: string) => h === 'fecha');
        const stripeValorIdx = stripeHeaders.findIndex((h: string) => h.includes('valor_usd'));

        for (let i = 1; i < stripeRows.length; i++) {
            const row = stripeRows[i];
            if (!row) continue;

            const descripcion = row[stripeDescIdx]?.toString() || '';
            if (descripcion !== 'Cobro') continue;

            const fecha = parseDate(row[stripeFechaIdx]);
            if (!fecha) continue;

            const valor = parseNumber(row[stripeValorIdx]);
            if (valor <= 0) continue;

            const mesKey = getMonthKey(fecha);
            if (!revenueByMonth[mesKey]) {
                revenueByMonth[mesKey] = { revenue: 0, pagos: 0 };
            }
            revenueByMonth[mesKey].revenue += valor;
            revenueByMonth[mesKey].pagos += 1;
        }

        // Procesar Suscriptores
        interface Subscriber {
            created: Date;
            canceledAt: Date | null;
            status: string;
        }
        const subscribers: Subscriber[] = [];

        for (let i = 1; i < subsRows.length; i++) {
            const row = subsRows[i];
            if (!row) continue;

            const status = row[5]?.toString() || '';
            if (['incomplete', 'incomplete_expired'].includes(status)) continue;

            const created = parseDate(row[10]);
            if (!created) continue;

            const canceledAt = parseDate(row[11]);

            subscribers.push({ created, canceledAt, status });
        }

        // Agregar pauta y costos por mes desde transacciones consolidadas
        const pautaByMonth: Record<string, number> = {};
        const costosByMonth: Record<string, number> = {};
        const costosFijosByMonth: Record<string, number> = {};

        for (const tx of allTransactions) {
            const mesKey = getMonthKey(tx.fecha);

            if (tx.clasificacion === 'PAUTA PUBLICITARIA') {
                pautaByMonth[mesKey] = (pautaByMonth[mesKey] || 0) + tx.valorUSD;
            }
            if (tx.tipo === 'COSTOS VARIABLES') {
                costosByMonth[mesKey] = (costosByMonth[mesKey] || 0) + tx.valorUSD;
            }
            if (tx.tipo === 'COSTOS FIJOS') {
                costosFijosByMonth[mesKey] = (costosFijosByMonth[mesKey] || 0) + tx.valorUSD;
            }
        }

        // Calcular métricas por mes
        const meses = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'];
        const metricas: MonthlyMetrics[] = [];

        for (const mesKey of meses) {
            const [year, month] = mesKey.split('-').map(Number);
            const inicioMes = new Date(year, month - 1, 1);
            const finMes = new Date(year, month, 1);

            // Activos al inicio
            const activosInicio = subscribers.filter(s =>
                s.created < inicioMes &&
                (!s.canceledAt || s.canceledAt >= inicioMes)
            ).length;

            // Nuevos
            const nuevos = subscribers.filter(s =>
                s.created >= inicioMes && s.created < finMes
            ).length;

            // Cancelaciones
            const cancelaciones = subscribers.filter(s =>
                s.canceledAt && s.canceledAt >= inicioMes && s.canceledAt < finMes
            ).length;

            // Activos al final
            const activosFin = subscribers.filter(s =>
                s.created < finMes &&
                (!s.canceledAt || s.canceledAt >= finMes)
            ).length;

            // Churn
            const churnRate = activosInicio > 0 ? (cancelaciones / activosInicio) * 100 : 0;

            // Revenue y ARPU
            const revenue = revenueByMonth[mesKey]?.revenue || 0;
            const pagos = revenueByMonth[mesKey]?.pagos || 0;
            const arpu = pagos > 0 ? revenue / pagos : 0;

            // Lifetime y LTV
            const lifetime = churnRate > 0 ? 100 / churnRate : 12;
            const ltv = arpu * lifetime;

            // CAC (ahora con pauta consolidada de todos los bancos)
            const pauta = pautaByMonth[mesKey] || 0;
            const cac = nuevos > 0 ? pauta / nuevos : 0;

            // LTV:CAC
            const ltvCacRatio = cac > 0 ? ltv / cac : (pauta === 0 ? -1 : 0); // -1 significa infinito (sin pauta)

            // Costo variable
            const costoVariable = costosByMonth[mesKey] || 0;
            const costoVariablePorCliente = activosFin > 0 ? costoVariable / activosFin : 0;

            // Margen bruto
            const margenBruto = arpu - costoVariablePorCliente;
            const margenBrutoPct = arpu > 0 ? (margenBruto / arpu) * 100 : 0;

            // Payback
            const paybackMeses = arpu > 0 && cac > 0 ? cac / arpu : 0;

            metricas.push({
                mes: mesKey,
                mesLabel: formatMonthLabel(mesKey),
                activosInicio,
                nuevos,
                cancelaciones,
                activosFin,
                churnRate: Math.round(churnRate * 10) / 10,
                revenue: Math.round(revenue * 100) / 100,
                pagos,
                arpu: Math.round(arpu * 100) / 100,
                lifetime: Math.round(lifetime * 10) / 10,
                ltv: Math.round(ltv * 100) / 100,
                pauta: Math.round(pauta * 100) / 100,
                cac: Math.round(cac * 100) / 100,
                ltvCacRatio: ltvCacRatio === -1 ? -1 : Math.round(ltvCacRatio * 10) / 10,
                costoVariable: Math.round(costoVariable * 100) / 100,
                costoVariablePorCliente: Math.round(costoVariablePorCliente * 100) / 100,
                margenBruto: Math.round(margenBruto * 100) / 100,
                margenBrutoPct: Math.round(margenBrutoPct * 10) / 10,
                paybackMeses: Math.round(paybackMeses * 10) / 10
            });
        }

        // Determinar mes seleccionado (por defecto el último)
        const mesSeleccionadoKey = mesSeleccionadoParam || meses[meses.length - 1];
        const mesSeleccionado = metricas.find(m => m.mes === mesSeleccionadoKey) || metricas[metricas.length - 1];

        // Encontrar mes anterior para comparaciones
        const idxSeleccionado = metricas.findIndex(m => m.mes === mesSeleccionado.mes);
        const mesAnterior = idxSeleccionado > 0 ? metricas[idxSeleccionado - 1] : null;

        // Generar análisis profesional
        const analisis = generarAnalisis(metricas, mesSeleccionado, mesAnterior);

        // Lista de meses disponibles para el selector
        const mesesDisponibles = metricas.map(m => ({
            valor: m.mes,
            label: m.mesLabel
        }));

        // Calcular métricas financieras del mes seleccionado
        const costosFijosMes = costosFijosByMonth[mesSeleccionado.mes] || 0;
        const costosVariablesMes = costosByMonth[mesSeleccionado.mes] || 0;
        const grossProfit = mesSeleccionado.revenue - costosVariablesMes;
        const netIncome = grossProfit - costosFijosMes;
        const netMarginPct = mesSeleccionado.revenue > 0
            ? (netIncome / mesSeleccionado.revenue) * 100
            : 0;
        const burnRate = netIncome < 0 ? Math.abs(netIncome) : 0;

        // Calcular saldo acumulado (caja) hasta fin del mes seleccionado
        const [yearSel, monthSel] = mesSeleccionado.mes.split('-').map(Number);
        const finMesSeleccionado = new Date(yearSel, monthSel, 0, 23, 59, 59); // Último día del mes

        const cajaAlCierre = allTransactions
            .filter(tx => tx.fecha <= finMesSeleccionado)
            .reduce((sum, tx) => sum + tx.valorUSDConSigno, 0);

        // Runway = Caja / Burn Rate (si hay burn)
        const runway = burnRate > 0 ? cajaAlCierre / burnRate : 99;

        const financials: Financials = {
            grossProfit: Math.round(grossProfit * 100) / 100,
            netIncome: Math.round(netIncome * 100) / 100,
            netMarginPct: Math.round(netMarginPct * 10) / 10,
            burnRate: Math.round(burnRate * 100) / 100,
            runway: Math.round(runway * 10) / 10,
            costosFijos: Math.round(costosFijosMes * 100) / 100,
            cajaAlCierre: Math.round(cajaAlCierre * 100) / 100
        };

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            trm,

            // Mes seleccionado
            mesSeleccionado: mesSeleccionado.mes,
            mesSeleccionadoLabel: mesSeleccionado.mesLabel,

            // Análisis profesional para junta directiva
            analisis,

            // Métricas del mes seleccionado
            metricas: mesSeleccionado,

            // Métricas financieras del mes
            financials,

            // Métricas del mes anterior (para comparaciones)
            metricasMesAnterior: mesAnterior,

            // Histórico completo
            historico: metricas,

            // Meses disponibles para selector
            mesesDisponibles,

            // Benchmarks de referencia
            benchmarks: {
                ltvCacSaludable: 3,
                churnBueno: 30,
                paybackMaximo: 6,
                margenBrutoMinimo: 60
            }
        });

    } catch (error) {
        console.error('Error calculating unit economics:', error);
        return NextResponse.json(
            { success: false, error: 'Error al calcular unit economics' },
            { status: 500 }
        );
    }
}