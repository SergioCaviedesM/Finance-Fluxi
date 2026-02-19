import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAMES = ['Stripe', 'Bancolombia', 'FIC', 'Mercury', 'Mercury - Neuro'];

export interface Transaction {
  banco: string;
  fecha: string;
  descripcion: string;
  naturaleza: 'INGRESO' | 'EGRESO';
  clasificacion: string;
  categoria: string;
  tipo: string;
  valorCOP: number;
  valorUSD: number;
}

function getAuthClient(): JWT {
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function getSheetData(sheetName: string): Promise<Transaction[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0].map((h: string) => h.toLowerCase().trim());

  const colIndex = {
    banco: headers.findIndex((h: string) => h === 'banco'),
    fecha: headers.findIndex((h: string) => h === 'fecha'),
    descripcion: headers.findIndex((h: string) => h === 'descripcion' || h === 'descripción'),
    naturaleza: headers.findIndex((h: string) => h === 'naturaleza'),
    clasificacion: headers.findIndex((h: string) => h === 'clasificacion' || h === 'clasificación'),
    categoria: headers.findIndex((h: string) => h === 'categoria' || h === 'categoría'),
    tipo: headers.findIndex((h: string) => h === 'tipo'),
    valorCOP: headers.findIndex((h: string) => h === 'valor_cop'),
    valorUSD: headers.findIndex((h: string) => h === 'valor_usd'),
    proyecto: headers.findIndex((h: string) => h === 'proyecto'),
  };

  const transactions: Transaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const getValue = (idx: number) => (idx >= 0 && row[idx]) ? row[idx] : '';
    const getNumber = (idx: number) => {
      const val = getValue(idx);
      if (!val) return 0;
      const cleaned = val.toString().replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    };

    if (sheetName === 'Mercury - Neuro') {
      const proyecto = getValue(colIndex.proyecto).toUpperCase().trim();
      if (proyecto !== 'FLUXI') {
        continue;
      }
    }

    transactions.push({
      banco: getValue(colIndex.banco) || sheetName,
      fecha: getValue(colIndex.fecha),
      descripcion: getValue(colIndex.descripcion),
      naturaleza: getValue(colIndex.naturaleza).toUpperCase() as 'INGRESO' | 'EGRESO',
      clasificacion: getValue(colIndex.clasificacion),
      categoria: getValue(colIndex.categoria),
      tipo: getValue(colIndex.tipo),
      valorCOP: getNumber(colIndex.valorCOP),
      valorUSD: getNumber(colIndex.valorUSD),
    });
  }

  return transactions;
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];

  for (const sheetName of SHEET_NAMES) {
    try {
      const transactions = await getSheetData(sheetName);
      allTransactions.push(...transactions);
    } catch (error) {
      console.error(`Error fetching ${sheetName}:`, error);
    }
  }

  return allTransactions.sort((a, b) => {
    const dateA = parseDate(a.fecha);
    const dateB = parseDate(b.fecha);
    return dateB.getTime() - dateA.getTime();
  });
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }

  return new Date(dateStr);
}

export function getTotalsByBank(transactions: Transaction[], currency: 'COP' | 'USD' = 'COP') {
  const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';
  const totals: Record<string, number> = {};

  for (const tx of transactions) {
    const banco = tx.banco;
    if (!totals[banco]) totals[banco] = 0;
    totals[banco] += tx[valueKey];
  }

  return totals;
}

export function getTotalIngresos(transactions: Transaction[], currency: 'COP' | 'USD' = 'COP') {
  const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';
  return transactions
    .filter(tx => tx[valueKey] > 0 && tx.naturaleza.toUpperCase().trim() !== 'TRASLADO' && tx.clasificacion.toUpperCase().trim() !== 'APORTES DE CAPITAL')
    .reduce((sum, tx) => sum + tx[valueKey], 0);
}

export function getTotalEgresos(transactions: Transaction[], currency: 'COP' | 'USD' = 'COP') {
  const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';
  return transactions
    .filter(tx => tx[valueKey] < 0 && tx.naturaleza.toUpperCase().trim() !== 'TRASLADO')
    .reduce((sum, tx) => sum + Math.abs(tx[valueKey]), 0);
}

export function getTotalAportesCapital(transactions: Transaction[], currency: 'COP' | 'USD' = 'COP') {
  const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';
  return transactions
    .filter(tx => tx[valueKey] > 0 && tx.naturaleza.toUpperCase().trim() !== 'TRASLADO' && tx.clasificacion.toUpperCase().trim() === 'APORTES DE CAPITAL')
    .reduce((sum, tx) => sum + tx[valueKey], 0);
}

export function getSaldoTotal(transactions: Transaction[], currency: 'COP' | 'USD' = 'COP') {
  const valueKey = currency === 'COP' ? 'valorCOP' : 'valorUSD';
  return transactions.reduce((sum, tx) => sum + tx[valueKey], 0);
}

// === SUSCRIPTORES ===

export interface Subscription {
  subscriptionId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  status: string;
  planId: string;
  amount: number;
  amountCOP: number;
  currency: string;
  interval: string;
  created: Date;
  canceledAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `Suscriptores!A:O`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  const subscriptions: Subscription[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const parseDateValue = (val: any): Date | null => {
      if (!val) return null;

      if (typeof val === 'string' && val.includes('/')) {
        const parts = val.split(' ')[0].split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);

          const timePart = val.split(' ')[1];
          let hours = 0, minutes = 0;
          if (timePart) {
            const timeParts = timePart.split(':');
            hours = parseInt(timeParts[0]) || 0;
            minutes = parseInt(timeParts[1]) || 0;
          }

          return new Date(year, month, day, hours, minutes);
        }
      }

      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    };

    const parseNumber = (val: any): number => {
      if (!val) return 0;
      const cleaned = val.toString().replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    subscriptions.push({
      subscriptionId: row[1] || '',
      customerId: row[2] || '',
      customerEmail: row[3] || '',
      customerName: row[4] || '',
      status: row[5] || '',
      planId: row[6] || '',
      amount: parseNumber(row[7]),
      currency: row[8] || 'USD',
      interval: row[9] || 'month',
      created: parseDateValue(row[10]) || new Date(),
      canceledAt: parseDateValue(row[11]),
      currentPeriodStart: parseDateValue(row[12]) || new Date(),
      currentPeriodEnd: parseDateValue(row[13]) || new Date(),
      amountCOP: parseNumber(row[14]),
    });
  }

  return subscriptions;
}

// Filtra suscripciones válidas (excluye intentos de pago fallidos)
export function getValidSubscriptions(subscriptions: Subscription[]): Subscription[] {
  return subscriptions.filter(sub =>
    !['incomplete_expired', 'incomplete'].includes(sub.status)
  );
}

export function calculateMRR(subscriptions: Subscription[], currency: 'USD' | 'COP' = 'USD'): number {
  return subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => {
      const amount = currency === 'COP' ? sub.amountCOP : sub.amount;
      const monthlyAmount = sub.interval === 'year' ? amount / 12 : amount;
      return total + monthlyAmount;
    }, 0);
}

export function getActiveSubscribers(subscriptions: Subscription[]): number {
  return subscriptions.filter(sub => sub.status === 'active').length;
}

export function getPastDueSubscribers(subscriptions: Subscription[]): number {
  return subscriptions.filter(sub => sub.status === 'past_due').length;
}

export function getSubscriptionsByStatus(subscriptions: Subscription[]): Record<string, number> {
  const byStatus: Record<string, number> = {};
  subscriptions.forEach(sub => {
    byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
  });
  return byStatus;
}

export function getSubscriptionsByPlan(subscriptions: Subscription[]): Array<{ planId: string; count: number; mrr: number }> {
  const byPlan: Record<string, { count: number; mrr: number }> = {};

  subscriptions
    .filter(sub => sub.status === 'active')
    .forEach(sub => {
      if (!byPlan[sub.planId]) {
        byPlan[sub.planId] = { count: 0, mrr: 0 };
      }
      byPlan[sub.planId].count++;
      byPlan[sub.planId].mrr += sub.interval === 'year' ? sub.amount / 12 : sub.amount;
    });

  return Object.entries(byPlan)
    .map(([planId, data]) => ({ planId, ...data }))
    .sort((a, b) => b.mrr - a.mrr);
}

/**
 * Calcula métricas mensuales con la lógica CORRECTA de churn:
 * - Activos al inicio = suscripciones creadas ANTES del mes Y no canceladas AÚN al inicio
 * - Churn = Cancelaciones del mes ÷ Activos al inicio del mes
 */
export function getMonthlyGrowth(subscriptions: Subscription[], currency: 'USD' | 'COP' = 'USD'): Array<{
  month: string;
  nuevos: number;
  cancelaciones: number;
  neto: number;
  mrrGain: number;
  mrrLoss: number;
  churnRate: number;
  activosInicio: number;
  activosFin: number;
}> {
  const validSubs = getValidSubscriptions(subscriptions);

  // Encontrar rango de meses
  const allDates = validSubs.map(sub => sub.created.getTime());
  if (allDates.length === 0) return [];

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date();

  const results: Array<{
    month: string;
    nuevos: number;
    cancelaciones: number;
    neto: number;
    mrrGain: number;
    mrrLoss: number;
    churnRate: number;
    activosInicio: number;
    activosFin: number;
  }> = [];

  // Iterar mes por mes
  const currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  while (currentMonth <= maxDate) {
    const monthStr = currentMonth.toISOString().slice(0, 7);
    const startOfMonth = new Date(currentMonth);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    // ACTIVOS AL INICIO: Created < inicio del mes AND (Canceled >= inicio OR no cancelado)
    const activosInicio = validSubs.filter(sub => {
      const createdBefore = sub.created < startOfMonth;
      const notCanceledYet = !sub.canceledAt || sub.canceledAt >= startOfMonth;
      return createdBefore && notCanceledYet;
    }).length;

    // NUEVOS: Created >= inicio del mes AND Created < fin del mes
    const nuevos = validSubs.filter(sub => {
      return sub.created >= startOfMonth && sub.created < endOfMonth;
    });

    // CANCELACIONES: Canceled >= inicio del mes AND Canceled < fin del mes
    const cancelaciones = validSubs.filter(sub => {
      if (!sub.canceledAt) return false;
      return sub.canceledAt >= startOfMonth && sub.canceledAt < endOfMonth;
    });

    // ACTIVOS AL FINAL: Created < fin del mes AND (Canceled >= fin OR no cancelado)
    const activosFin = validSubs.filter(sub => {
      const createdBefore = sub.created < endOfMonth;
      const notCanceledYet = !sub.canceledAt || sub.canceledAt >= endOfMonth;
      return createdBefore && notCanceledYet;
    }).length;

    // MRR
    const mrrGain = nuevos.reduce((sum, sub) => {
      const amount = currency === 'COP' ? sub.amountCOP : sub.amount;
      return sum + (sub.interval === 'year' ? amount / 12 : amount);
    }, 0);

    const mrrLoss = cancelaciones.reduce((sum, sub) => {
      const amount = currency === 'COP' ? sub.amountCOP : sub.amount;
      return sum + (sub.interval === 'year' ? amount / 12 : amount);
    }, 0);

    // CHURN RATE: Cancelaciones ÷ Activos al inicio
    const churnRate = activosInicio > 0 ? (cancelaciones.length / activosInicio) * 100 : 0;

    results.push({
      month: monthStr,
      nuevos: nuevos.length,
      cancelaciones: cancelaciones.length,
      neto: nuevos.length - cancelaciones.length,
      mrrGain,
      mrrLoss,
      churnRate,
      activosInicio,
      activosFin,
    });

    // Siguiente mes
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  return results;
}

export function getDailyActiveSubscribers(subscriptions: Subscription[], currency: 'USD' | 'COP' = 'USD'): Array<{ date: string; activos: number; mrr: number }> {
  const validSubs = getValidSubscriptions(subscriptions);
  if (validSubs.length === 0) return [];

  const dates = validSubs.map(sub => sub.created.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date();

  const dailyData: Array<{ date: string; activos: number; mrr: number }> = [];

  for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);

    const activosEseDia = validSubs.filter(sub => {
      const created = sub.created <= currentDate;
      const notCanceled = !sub.canceledAt || sub.canceledAt > currentDate;
      return created && notCanceled;
    });

    const mrr = activosEseDia.reduce((sum, sub) => {
      const amount = currency === 'COP' ? sub.amountCOP : sub.amount;
      return sum + (sub.interval === 'year' ? amount / 12 : amount);
    }, 0);

    dailyData.push({
      date: currentDate.toISOString().slice(0, 10),
      activos: activosEseDia.length,
      mrr,
    });
  }

  return dailyData;
}

/**
 * ANÁLISIS DE COHORTES
 * Agrupa usuarios por mes de creación y calcula retención en cada mes de vida
 */
export interface CohortData {
  cohort: string;           // Mes de creación (YYYY-MM)
  totalUsers: number;       // Total de usuarios en la cohorte
  retention: number[];      // Array de retención por mes de vida [mes0, mes1, mes2, ...]
  retentionPct: number[];   // Array de % de retención [100, 85, 70, ...]
}

export function getCohortAnalysis(subscriptions: Subscription[]): CohortData[] {
  const validSubs = getValidSubscriptions(subscriptions);
  if (validSubs.length === 0) return [];

  // Agrupar por mes de creación usando fechas LOCALES
  const cohorts: Record<string, Subscription[]> = {};

  validSubs.forEach(sub => {
    const d = sub.created;
    const cohortMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!cohorts[cohortMonth]) {
      cohorts[cohortMonth] = [];
    }
    cohorts[cohortMonth].push(sub);
  });

  const sortedCohortMonths = Object.keys(cohorts).sort();
  const today = new Date();
  // Primer día del mes actual en hora LOCAL
  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);

  const results: CohortData[] = [];

  for (const cohortMonth of sortedCohortMonths) {
    const cohortSubs = cohorts[cohortMonth];
    const totalUsers = cohortSubs.length;

    const [year, month] = cohortMonth.split('-').map(Number);
    // Primer día de la cohorte en hora LOCAL
    let evalDate = new Date(year, month - 1, 1);

    const retention: number[] = [];
    const retentionPct: number[] = [];
    let monthsOfLife = 0;

    // Iterar mes a mes hasta el mes actual (inclusive)
    while (evalDate <= currentMonthDate) {
      const evalEndOfMonth = new Date(evalDate.getFullYear(), evalDate.getMonth() + 1, 1);

      // Contar cuántos de la cohorte siguen activos al final de este mes de vida
      const activeCount = cohortSubs.filter(sub => {
        const notCanceledYet = !sub.canceledAt || sub.canceledAt >= evalEndOfMonth;
        return notCanceledYet;
      }).length;

      retention.push(activeCount);
      retentionPct.push(totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0);

      // Siguiente mes de vida
      evalDate = new Date(evalDate.getFullYear(), evalDate.getMonth() + 1, 1);
      monthsOfLife++;

      if (monthsOfLife >= 12) break;
    }

    results.push({
      cohort: cohortMonth,
      totalUsers,
      retention,
      retentionPct,
    });
  }

  return results;
}

/**
 * Histórico de suscriptores por mes (snapshot al final de cada mes)
 */
export function getMonthlySubscriberHistory(subscriptions: Subscription[]): Array<{
  month: string;
  activeSubscribers: number;
  mrr: number;
}> {
  const validSubs = getValidSubscriptions(subscriptions);
  if (validSubs.length === 0) return [];

  const dates = validSubs.map(sub => sub.created.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date();

  const results: Array<{ month: string; activeSubscribers: number; mrr: number }> = [];

  const currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  while (currentMonth <= maxDate) {
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    const activosAlFinal = validSubs.filter(sub => {
      const createdBefore = sub.created < endOfMonth;
      const notCanceledYet = !sub.canceledAt || sub.canceledAt >= endOfMonth;
      return createdBefore && notCanceledYet;
    });

    const mrr = activosAlFinal.reduce((sum, sub) => {
      return sum + (sub.interval === 'year' ? sub.amount / 12 : sub.amount);
    }, 0);

    results.push({
      month: currentMonth.toISOString().slice(0, 7),
      activeSubscribers: activosAlFinal.length,
      mrr,
    });

    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  return results;
}