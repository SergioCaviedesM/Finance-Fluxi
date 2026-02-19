import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuthClient(): JWT {
    return new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}

function parseDateValue(val: any): Date | null {
    if (!val) return null;

    if (typeof val === 'string' && val.includes('/')) {
        const parts = val.split(' ')[0].split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
    }

    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
}

// Parsear número en formato colombiano/europeo
// Formato: "4.200,50" = 4200.50 (puntos = miles, coma = decimal)
function parseNumber(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;

    let str = val.toString().trim();

    // Detectar formato: si tiene coma Y punto, es formato colombiano
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');

    if (hasComma && hasDot) {
        // Formato colombiano: "4.200,50" → remover puntos (miles), reemplazar coma por punto (decimal)
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        // Solo coma: podría ser decimal (50,00) o miles (4,200)
        // Si la coma está seguida de exactamente 2 dígitos al final, es decimal
        if (/,\d{2}$/.test(str)) {
            str = str.replace(',', '.');
        } else {
            // Es separador de miles
            str = str.replace(/,/g, '');
        }
    }
    // Si solo tiene punto, asumimos que es decimal (formato standard)

    const cleaned = str.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
}

interface ArpuMensual {
    mes: string;
    mesLabel: string;
    pagos: number;
    revenue: number;
    revenueCOP: number;
    arpu: number;
    arpuCOP: number;
}

const MESES_ES: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

function formatMesLabel(mes: string): string {
    const [year, month] = mes.split('-');
    return `${MESES_ES[month] || month} ${year?.slice(2)}`;
}

export async function GET() {
    try {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // Fetch TRM from Dólar sheet - find most recent date
        let trm = 4200; // Default fallback
        let trmFecha = '';
        try {
            const dolarResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: 'Dólar!A:B',
            });
            const dolarRows = dolarResponse.data.values || [];

            // Find the most recent date with a valid TRM
            let mostRecentDate: Date | null = null;
            let mostRecentTrm = 4200;
            let mostRecentFecha = '';

            for (let i = 1; i < dolarRows.length; i++) { // Skip header row
                const row = dolarRows[i];
                if (!row || row.length < 2) continue;

                // Parse date from DD/MM/YYYY format
                const fechaStr = row[0]?.toString() || '';
                const trmVal = parseNumber(row[1]);

                if (trmVal <= 1000) continue; // Skip invalid TRM values

                // Parse DD/MM/YYYY
                const parts = fechaStr.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    const fecha = new Date(year, month, day);

                    if (!isNaN(fecha.getTime())) {
                        if (!mostRecentDate || fecha > mostRecentDate) {
                            mostRecentDate = fecha;
                            mostRecentTrm = trmVal;
                            mostRecentFecha = fechaStr;
                        }
                    }
                }
            }

            if (mostRecentDate) {
                trm = mostRecentTrm;
                trmFecha = mostRecentFecha;
            }
            console.log('Final TRM:', trm);
            console.log('=== END DEBUG ===');
        } catch (e) {
            console.warn('Could not fetch TRM, using default:', e);
        }

        const stripeResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Stripe!A:N',
        });
        const rows = stripeResponse.data.values || [];

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: 'No hay datos' }, { status: 404 });
        }

        const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim() || '');

        const colIndex = {
            fecha: headers.findIndex((h: string) => h === 'fecha'),
            descripcion: headers.findIndex((h: string) => h === 'descripcion' || h === 'descripción'),
            valorUSD: headers.findIndex((h: string) => h === 'valor_usd'),
            customerId: headers.findIndex((h: string) => h === 'customer id'),
        };

        if (colIndex.fecha === -1) colIndex.fecha = 1;
        if (colIndex.descripcion === -1) colIndex.descripcion = 2;
        if (colIndex.valorUSD === -1) colIndex.valorUSD = 3;
        if (colIndex.customerId === -1) colIndex.customerId = 6;

        const cobrosPorMes: Record<string, { clientes: Set<string>; revenue: number; pagos: number }> = {};

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const descripcion = row[colIndex.descripcion]?.toString() || '';
            if (descripcion !== 'Cobro') continue;

            const fecha = parseDateValue(row[colIndex.fecha]);
            if (!fecha) continue;

            const year = fecha.getFullYear();
            if (year < 2025 || year > 2026) continue;

            const valorUSD = parseNumber(row[colIndex.valorUSD]);
            if (valorUSD <= 0) continue;

            const customerId = row[colIndex.customerId]?.toString() || `unknown_${i}`;
            const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

            if (!cobrosPorMes[mesKey]) {
                cobrosPorMes[mesKey] = { clientes: new Set(), revenue: 0, pagos: 0 };
            }

            cobrosPorMes[mesKey].clientes.add(customerId);
            cobrosPorMes[mesKey].revenue += valorUSD;
            cobrosPorMes[mesKey].pagos += 1;
        }

        const arpuMensual: ArpuMensual[] = Object.entries(cobrosPorMes)
            .map(([mes, data]) => {
                const revenue = Math.round(data.revenue * 100) / 100;
                const arpu = data.pagos > 0 ? Math.round((data.revenue / data.pagos) * 100) / 100 : 0;
                return {
                    mes,
                    mesLabel: formatMesLabel(mes),
                    pagos: data.pagos,
                    revenue,
                    revenueCOP: Math.round(revenue * trm),
                    arpu,
                    arpuCOP: Math.round(arpu * trm),
                };
            })
            .sort((a, b) => a.mes.localeCompare(b.mes));

        const ahora = new Date();
        const mesActualKey = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
        const datosMesActual = arpuMensual.find(m => m.mes === mesActualKey);

        const totalRevenue = arpuMensual.reduce((sum, m) => sum + m.revenue, 0);
        const totalPagos = arpuMensual.reduce((sum, m) => sum + m.pagos, 0);
        const arpuGlobal = totalPagos > 0 ? Math.round((totalRevenue / totalPagos) * 100) / 100 : 0;

        // MRR is the revenue of the current month
        const mrrActual = datosMesActual?.revenue || 0;

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            trm,
            arpuMesActual: datosMesActual?.arpu || 0,
            arpuMesActualCOP: datosMesActual?.arpuCOP || 0,
            mesActual: datosMesActual?.mesLabel || formatMesLabel(mesActualKey),
            mrrActual,
            mrrActualCOP: Math.round(mrrActual * trm),
            resumen: {
                totalRevenue,
                totalRevenueCOP: Math.round(totalRevenue * trm),
                totalPagos,
                arpuGlobal,
                arpuGlobalCOP: Math.round(arpuGlobal * trm),
                mesesConDatos: arpuMensual.length,
            },
            arpuMensual,
        });

    } catch (error) {
        console.error('Error calculating ARPU:', error);
        return NextResponse.json(
            { success: false, error: 'Error al calcular ARPU' },
            { status: 500 }
        );
    }
}