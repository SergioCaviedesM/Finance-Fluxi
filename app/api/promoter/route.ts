import { NextResponse } from "next/server";
import { getRawSheetData } from "@/lib/sheets";

// Sheet names matching the Apps Script output
const FP_SHEETS = {
    PROMOTORES: "FP - Promotores",
    OVERVIEW: "FP - Overview",
    REFERRALS: "FP - Referrals",
    COMISIONES: "FP - Comisiones",
    REPORTE_MENSUAL: "FP - Reporte Mensual",
};

// Fields that should always stay as strings
const STRING_FIELDS = new Set([
    "Email", "UID", "Event ID", "Ref Link", "Código Promo",
    "Promotor Email", "Referral Email", "Moneda Original",
    "Fraud Check", "Pagada", "Estado", "Tipo", "Fuente",
    "Nombre", "Promotor Nombre", "Campaña", "Período",
    "Fecha Ingreso", "Último Login", "Última Actualización",
    "Fecha Creación", "Cliente Desde", "Mes Cohorte", "Plan ID",
]);

function parseCurrencyValue(val: string): number {
    // Remove $ sign, spaces, then handle "1.162,99" format (dots=thousands, comma=decimal)
    const cleaned = val.replace(/[$\s]/g, "");
    // If it has comma as decimal separator: "1.162,99" → "1162.99"
    if (cleaned.includes(",")) {
        return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(cleaned.replace(/,/g, "")) || 0;
}

function parseRows(rows: string[][], headers: string[]) {
    return rows.map((row) => {
        const obj: Record<string, string | number> = {};
        headers.forEach((h, i) => {
            const val = row[i] ?? "";
            if (STRING_FIELDS.has(h)) {
                obj[h] = val;
                return;
            }
            // Currency fields (start with $ or contain currency-like patterns)
            if (val.startsWith("$") || /^\$?\d[\d.,]*$/.test(val.trim())) {
                obj[h] = parseCurrencyValue(val);
                return;
            }
            // Percentage-like fields with comma decimal ("16,51")
            if (/^\d+,\d+$/.test(val.trim())) {
                obj[h] = parseFloat(val.replace(",", ".")) || 0;
                return;
            }
            // Regular number
            const num = Number(val);
            obj[h] = val !== "" && !isNaN(num) ? num : val;
        });
        return obj;
    });
}

export async function GET() {
    try {
        // Read all FP sheets
        const [promotoresRaw, overviewRaw, referralsRaw, comisionesRaw, reporteMensualRaw] =
            await Promise.all([
                getRawSheetData(FP_SHEETS.PROMOTORES),
                getRawSheetData(FP_SHEETS.OVERVIEW),
                getRawSheetData(FP_SHEETS.REFERRALS),
                getRawSheetData(FP_SHEETS.COMISIONES),
                getRawSheetData(FP_SHEETS.REPORTE_MENSUAL),
            ]);

        // Parse each sheet (first row = headers, rest = data)
        const promotores = promotoresRaw.length > 1
            ? parseRows(promotoresRaw.slice(1), promotoresRaw[0])
            : [];

        const overview = overviewRaw.length > 1
            ? parseRows(overviewRaw.slice(1), overviewRaw[0])
            : [];

        const referrals = referralsRaw.length > 1
            ? parseRows(referralsRaw.slice(1), referralsRaw[0])
            : [];

        const comisiones = comisionesRaw.length > 1
            ? parseRows(comisionesRaw.slice(1), comisionesRaw[0])
            : [];

        const reporteMensual = reporteMensualRaw.length > 1
            ? parseRows(reporteMensualRaw.slice(1), reporteMensualRaw[0])
            : [];

        return NextResponse.json({
            success: true,
            promotores,
            overview,
            referrals,
            comisiones,
            reporteMensual,
        });
    } catch (err) {
        console.error("Error fetching promoter data:", err);
        return NextResponse.json(
            { success: false, error: "Error al cargar datos de promotores" },
            { status: 500 }
        );
    }
}