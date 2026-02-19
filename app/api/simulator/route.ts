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
    let str = val.toString().trim();
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        if (/,\d{2}$/.test(str)) {
            str = str.replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    }
    const cleaned = str.replace(/[^0-9.-]/g, '');
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

function addMonths(monthKey: string, n: number): string {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1 + n, 1);
    return getMonthKey(date);
}

// Interfaces
interface SimulatorParams {
    // Datos iniciales (mes 0)
    cajaInicial: number;
    activosInicio: number;
    nuevosInicial: number;
    churnInicial: number;

    // Parámetros de evolución
    churnDeltaMes: number;      // Cambio mensual del churn (ej: -0.05 = mejora 5pp)
    churnPiso: number;          // Churn mínimo posible
    growthInicial: number;      // Crecimiento inicial de nuevos clientes
    growthDeltaMes: number;     // Cambio mensual del growth
    growthTecho: number;        // Growth máximo posible

    // Costos
    costosFijosBase: number;
    costosFijosDeltaPct: number; // % de incremento
    costosFijosCadaMes: number;  // Cada cuántos meses sube
    costoVarCliente: number;

    // Adquisición
    cacPresupuesto: number;      // Presupuesto mensual de pauta

    // Pricing
    precioMes1: number;          // Precio primer mes (trial/intro)
    precioMes2: number;          // Precio mes 2 en adelante
}

interface MesProyectado {
    mes: number;
    mesKey: string;
    mesLabel: string;

    // Parámetros aplicados
    churn: number;
    growth: number;
    costosFijos: number;
    costoVarCliente: number;

    // Métricas calculadas
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

    // Usuarios
    activosInicio: number;
    nuevos: number;
    cancelaciones: number;
    activosFin: number;

    // Estado de resultados
    mrr: number;
    costoVarTotal: number;
    grossProfit: number;
    netIncome: number;
    netMarginPct: number;

    // Caja y runway
    caja: number;
    burnRate: number;
    runway: number;
    status: 'PROFITABLE' | 'BURNING' | 'BANKRUPT';
}

interface Conclusiones {
    mesRentabilidad: number | null;
    mesBreakeven: number | null;
    clientesBreakeven: number;
    mesLtvCacSaludable: number | null;
    runwayInicial: number;
    cajaInicial: number;
    cajaFinal: number;
    alertas: string[];
    resumen: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Parámetros opcionales del query string
        const mesReferenciaParam = searchParams.get('mesReferencia');

        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Obtener datos de Stripe para revenue
        const stripeResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Stripe!A:Z',
        });
        const stripeRows = stripeResponse.data.values || [];

        // 2. Obtener suscriptores
        const subsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Suscriptores!A:Z',
        });
        const subsRows = subsResponse.data.values || [];

        // 3. Obtener TODAS las transacciones para calcular caja y costos
        const allTransactions: Array<{
            fecha: Date;
            clasificacion: string;
            tipo: string;
            valorUSD: number;
            valorUSDConSigno: number;
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

        // 5. Procesar datos históricos por mes

        // Revenue por mes (Stripe Cobros)
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

        // Suscriptores por mes
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

        // Pauta y costos por mes
        const pautaByMonth: Record<string, number> = {};
        const costosFijosByMonth: Record<string, number> = {};
        const costosVarByMonth: Record<string, number> = {};

        for (const tx of allTransactions) {
            const mesKey = getMonthKey(tx.fecha);

            if (tx.clasificacion === 'PAUTA PUBLICITARIA') {
                pautaByMonth[mesKey] = (pautaByMonth[mesKey] || 0) + tx.valorUSD;
            }
            if (tx.tipo === 'COSTOS FIJOS') {
                costosFijosByMonth[mesKey] = (costosFijosByMonth[mesKey] || 0) + tx.valorUSD;
            }
            if (tx.tipo === 'COSTOS VARIABLES' || tx.tipo === 'GASTOS VARIABLES') {
                costosVarByMonth[mesKey] = (costosVarByMonth[mesKey] || 0) + tx.valorUSD;
            }
        }

        // Calcular métricas por mes histórico
        const allMonths = [...new Set([
            ...Object.keys(revenueByMonth),
            ...Object.keys(pautaByMonth)
        ])].sort();

        interface MonthData {
            mes: string;
            activosInicio: number;
            nuevos: number;
            cancelaciones: number;
            activosFin: number;
            churnRate: number;
            revenue: number;
            pagos: number;
            arpu: number;
            pauta: number;
            costosFijos: number;
            costosVar: number;
        }

        const monthlyData: MonthData[] = [];

        for (const mesKey of allMonths) {
            const [year, month] = mesKey.split('-').map(Number);
            const inicioMes = new Date(year, month - 1, 1);
            const finMes = new Date(year, month, 0, 23, 59, 59);
            const inicioMesAnterior = new Date(year, month - 2, 1);
            const finMesAnterior = new Date(year, month - 1, 0, 23, 59, 59);

            // Activos al inicio del mes
            const activosInicio = subscribers.filter(s => {
                const created = s.created;
                const canceled = s.canceledAt;
                return created <= finMesAnterior && (!canceled || canceled > finMesAnterior);
            }).length;

            // Nuevos en el mes
            const nuevos = subscribers.filter(s => {
                return s.created >= inicioMes && s.created <= finMes;
            }).length;

            // Cancelaciones en el mes
            const cancelaciones = subscribers.filter(s => {
                return s.canceledAt && s.canceledAt >= inicioMes && s.canceledAt <= finMes;
            }).length;

            // Activos al fin del mes
            const activosFin = subscribers.filter(s => {
                const created = s.created;
                const canceled = s.canceledAt;
                return created <= finMes && (!canceled || canceled > finMes);
            }).length;

            const churnRate = activosInicio > 0 ? cancelaciones / activosInicio : 0;
            const revData = revenueByMonth[mesKey] || { revenue: 0, pagos: 0 };
            const arpu = revData.pagos > 0 ? revData.revenue / revData.pagos : 0;

            monthlyData.push({
                mes: mesKey,
                activosInicio,
                nuevos,
                cancelaciones,
                activosFin,
                churnRate,
                revenue: revData.revenue,
                pagos: revData.pagos,
                arpu,
                pauta: pautaByMonth[mesKey] || 0,
                costosFijos: costosFijosByMonth[mesKey] || 0,
                costosVar: costosVarByMonth[mesKey] || 0
            });
        }

        // Determinar mes de referencia
        const mesReferencia = mesReferenciaParam || (monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].mes : getMonthKey(new Date()));
        const datosReferencia = monthlyData.find(m => m.mes === mesReferencia) || monthlyData[monthlyData.length - 1];

        if (!datosReferencia) {
            return NextResponse.json({
                success: false,
                error: 'No hay datos disponibles para el mes de referencia'
            }, { status: 400 });
        }

        // Calcular caja al cierre del mes de referencia
        const [yearRef, monthRef] = mesReferencia.split('-').map(Number);
        const finMesReferencia = new Date(yearRef, monthRef, 0, 23, 59, 59);

        const cajaAlCierre = allTransactions
            .filter(tx => tx.fecha <= finMesReferencia)
            .reduce((sum, tx) => sum + tx.valorUSDConSigno, 0);

        // Calcular costo variable por cliente
        const costoVarPorCliente = datosReferencia.activosFin > 0
            ? datosReferencia.costosVar / datosReferencia.activosFin
            : 23.9; // Default del Excel

        // Leer parámetros del query o usar defaults basados en datos reales
        const params: SimulatorParams = {
            cajaInicial: parseFloat(searchParams.get('cajaInicial') || '') || cajaAlCierre,
            activosInicio: parseFloat(searchParams.get('activosInicio') || '') || datosReferencia.activosFin,
            nuevosInicial: parseFloat(searchParams.get('nuevosInicial') || '') || datosReferencia.nuevos,
            churnInicial: parseFloat(searchParams.get('churnInicial') || '') || datosReferencia.churnRate,

            churnDeltaMes: parseFloat(searchParams.get('churnDeltaMes') || '') || -0.05,
            churnPiso: parseFloat(searchParams.get('churnPiso') || '') || 0.30,
            growthInicial: parseFloat(searchParams.get('growthInicial') || '') || 0.10,
            growthDeltaMes: parseFloat(searchParams.get('growthDeltaMes') || '') || 0,
            growthTecho: parseFloat(searchParams.get('growthTecho') || '') || 0.30,

            costosFijosBase: parseFloat(searchParams.get('costosFijosBase') || '') || datosReferencia.costosFijos || 51351,
            costosFijosDeltaPct: parseFloat(searchParams.get('costosFijosDeltaPct') || '') || 0.10,
            costosFijosCadaMes: parseFloat(searchParams.get('costosFijosCadaMes') || '') || 3,
            costoVarCliente: parseFloat(searchParams.get('costoVarCliente') || '') || costoVarPorCliente,

            cacPresupuesto: parseFloat(searchParams.get('cacPresupuesto') || '') || datosReferencia.pauta || 10601,

            precioMes1: parseFloat(searchParams.get('precioMes1') || '') || 17,
            precioMes2: parseFloat(searchParams.get('precioMes2') || '') || 50,
        };

        // 6. GENERAR PROYECCIÓN A 12 MESES
        const proyeccion: MesProyectado[] = [];

        for (let m = 0; m <= 12; m++) {
            const mesKey = addMonths(mesReferencia, m);
            const mesLabel = formatMonthLabel(mesKey);

            // Parámetros del mes (fórmulas del Excel)
            const churn = m === 0
                ? params.churnInicial
                : Math.max(params.churnPiso, params.churnInicial + m * params.churnDeltaMes);

            const growth = m === 0
                ? 0
                : Math.min(params.growthTecho, params.growthInicial + (m - 1) * params.growthDeltaMes);

            // Costos fijos suben cada X meses
            const incrementosCostosFijos = Math.floor(m / params.costosFijosCadaMes);
            const costosFijos = params.costosFijosBase * Math.pow(1 + params.costosFijosDeltaPct, incrementosCostosFijos);

            // Métricas calculadas
            const lifetime = churn > 0 ? 1 / churn : 0;

            // ARPU ponderado: (Precio1 * 1 + Precio2 * (lifetime - 1)) / lifetime
            const arpu = lifetime > 0
                ? ((params.precioMes1 * 1) + (params.precioMes2 * Math.max(0, lifetime - 1))) / lifetime
                : 0;

            const margenCliente = arpu - params.costoVarCliente;
            const margenBrutoPct = arpu > 0 ? margenCliente / arpu : 0;
            const ltvBruto = arpu * lifetime;
            const ltvNeto = margenCliente * lifetime;

            // Usuarios
            let activosInicioMes: number;
            let nuevos: number;
            let cancelaciones: number;
            let activosFin: number;

            if (m === 0) {
                // Mes 0: datos del mes de referencia
                activosInicioMes = datosReferencia.activosInicio;
                nuevos = datosReferencia.nuevos;
                cancelaciones = -datosReferencia.cancelaciones; // Negativo
                activosFin = datosReferencia.activosFin;
            } else {
                // Mes m: proyección basada en mes anterior
                const prev = proyeccion[m - 1];
                activosInicioMes = prev.activosFin;
                nuevos = Math.round(prev.nuevos * (1 + growth));
                cancelaciones = -Math.round(activosInicioMes * churn);
                activosFin = activosInicioMes + nuevos + cancelaciones;
            }

            // CAC = Presupuesto de pauta / Nuevos clientes
            const cac = nuevos > 0 ? params.cacPresupuesto / nuevos : 0;
            const ltvCac = cac > 0 ? ltvNeto / cac : (ltvNeto > 0 ? 999 : 0);

            // Break-even (clientes necesarios para cubrir costos fijos)
            const breakeven = margenCliente > 0 ? costosFijos / margenCliente : 0;
            const deficitSuperavit = activosFin - breakeven;

            // Estado de resultados
            const mrr = activosFin * arpu;
            const costoVarTotal = activosFin * params.costoVarCliente;
            const grossProfit = mrr - costoVarTotal;
            const netIncome = grossProfit - costosFijos;
            const netMarginPct = mrr > 0 ? netIncome / mrr : 0;

            // Caja y runway
            let caja: number;
            if (m === 0) {
                caja = params.cajaInicial;
            } else {
                const prev = proyeccion[m - 1];
                caja = prev.caja + prev.netIncome;
            }

            const burnRate = netIncome < 0 ? Math.abs(netIncome) : 0;
            const runway = burnRate > 0 ? caja / burnRate : 999;

            let status: 'PROFITABLE' | 'BURNING' | 'BANKRUPT';
            if (caja < 0) {
                status = 'BANKRUPT';
            } else if (netIncome > 0) {
                status = 'PROFITABLE';
            } else {
                status = 'BURNING';
            }

            proyeccion.push({
                mes: m,
                mesKey,
                mesLabel,
                churn,
                growth,
                costosFijos,
                costoVarCliente: params.costoVarCliente,
                lifetime,
                arpu,
                margenCliente,
                margenBrutoPct,
                ltvBruto,
                ltvNeto,
                cac,
                ltvCac,
                breakeven,
                deficitSuperavit,
                activosInicio: activosInicioMes,
                nuevos,
                cancelaciones,
                activosFin,
                mrr,
                costoVarTotal,
                grossProfit,
                netIncome,
                netMarginPct,
                caja,
                burnRate,
                runway,
                status
            });
        }

        // 7. GENERAR CONCLUSIONES
        const mesRentabilidad = proyeccion.findIndex(p => p.mes > 0 && p.netIncome > 0);
        const mesBreakeven = proyeccion.findIndex(p => p.mes > 0 && p.deficitSuperavit >= 0);
        const mesLtvCacSaludable = proyeccion.findIndex(p => p.ltvCac >= 3);

        const ultimoMes = proyeccion[proyeccion.length - 1];
        const primerMes = proyeccion[0];

        const alertas: string[] = [];

        // Alertas de runway
        if (primerMes.runway < 6 && primerMes.runway > 0) {
            alertas.push(`⚠️ Runway crítico: Solo ${primerMes.runway.toFixed(1)} meses de caja disponible`);
        }

        // Alerta si nunca alcanza rentabilidad
        if (mesRentabilidad === -1) {
            alertas.push('⚠️ No se alcanza rentabilidad en los próximos 12 meses con este escenario');
        }

        // Alerta si quiebra
        const mesQuiebra = proyeccion.findIndex(p => p.status === 'BANKRUPT');
        if (mesQuiebra > 0) {
            alertas.push(`🚨 La caja se agota en el mes ${mesQuiebra} (${proyeccion[mesQuiebra].mesLabel})`);
        }

        // Alerta de LTV:CAC bajo
        if (primerMes.ltvCac < 3 && primerMes.ltvCac > 0) {
            alertas.push(`⚠️ LTV:CAC actual de ${primerMes.ltvCac.toFixed(1)}x está por debajo del benchmark de 3x`);
        }

        // Alerta de churn alto
        if (primerMes.churn > 0.5) {
            alertas.push(`⚠️ Churn del ${(primerMes.churn * 100).toFixed(0)}% es muy alto. Impacta severamente el LTV`);
        }

        // Generar resumen
        let resumen = '';
        if (mesRentabilidad > 0) {
            resumen = `Con este escenario, alcanzas rentabilidad en el mes ${mesRentabilidad} (${proyeccion[mesRentabilidad].mesLabel}). `;
        } else if (ultimoMes.netIncome > 0) {
            resumen = `Actualmente eres rentable con Net Income de $${ultimoMes.netIncome.toFixed(0)}/mes. `;
        } else {
            resumen = `No alcanzas rentabilidad en 12 meses. El déficit mensual se reduce de $${Math.abs(primerMes.netIncome).toFixed(0)} a $${Math.abs(ultimoMes.netIncome).toFixed(0)}. `;
        }

        if (mesBreakeven > 0) {
            resumen += `Break-even de ${Math.round(proyeccion[mesBreakeven].breakeven)} clientes en mes ${mesBreakeven}.`;
        }

        const conclusiones: Conclusiones = {
            mesRentabilidad: mesRentabilidad > 0 ? mesRentabilidad : null,
            mesBreakeven: mesBreakeven > 0 ? mesBreakeven : null,
            clientesBreakeven: Math.round(primerMes.breakeven),
            mesLtvCacSaludable: mesLtvCacSaludable >= 0 ? mesLtvCacSaludable : null,
            runwayInicial: primerMes.runway,
            cajaInicial: primerMes.caja,
            cajaFinal: ultimoMes.caja,
            alertas,
            resumen
        };

        // Meses disponibles para selector
        const mesesDisponibles = monthlyData.map(m => ({
            valor: m.mes,
            label: formatMonthLabel(m.mes)
        }));

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            trm,

            // Mes de referencia
            mesReferencia: {
                mes: mesReferencia,
                label: formatMonthLabel(mesReferencia),
                datos: datosReferencia
            },

            // Parámetros utilizados
            parametros: params,

            // Proyección completa
            proyeccion,

            // Conclusiones automáticas
            conclusiones,

            // Meses disponibles
            mesesDisponibles,

            // Datos para el panel de control (valores por defecto basados en datos reales)
            defaults: {
                cajaInicial: cajaAlCierre,
                activosInicio: datosReferencia.activosFin,
                nuevosInicial: datosReferencia.nuevos,
                churnInicial: datosReferencia.churnRate,
                costosFijosBase: datosReferencia.costosFijos || 51351,
                costoVarCliente: costoVarPorCliente,
                cacPresupuesto: datosReferencia.pauta || 10601,
                arpu: datosReferencia.arpu
            }
        });

    } catch (error) {
        console.error('Error in simulator:', error);
        return NextResponse.json(
            { success: false, error: 'Error al generar simulación' },
            { status: 500 }
        );
    }
}