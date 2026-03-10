"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    RefreshCw,
    DollarSign,
    MousePointerClick,
    TrendingUp,
    Filter,
    ChevronDown,
    Trophy,
    UserCheck,
    ArrowRight,
    X,
    BarChart3,
    Eye,
    EyeOff,
    Info,
    Percent,
    Hash,
    Banknote,
    LayoutGrid,
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ============================================================
// TYPES
// ============================================================
interface Promoter { ID: number; Nombre: string; Email: string; Estado: string; Clicks: number; Referrals: number; Ventas: number; "Revenue (USD)": number; "Clientes Activos": number; "Comisiones Ganadas": number; Campaña: string; "Código Promo": string; "Ref Link": string; "Fecha Ingreso": string; "Último Login": string; }
interface Referral { "ID Referral": number; Email: string; UID: string; Estado: string; Fuente: string; "Promotor ID": number; "Promotor Nombre": string; "Promotor Email": string; Campaña: string; "Fecha Creación": string; "Cliente Desde": string; "Fraud Check": string; "Mes Cohorte": string; }
interface Commission { "ID Comisión": number; Estado: string; Tipo: string; "Monto Venta (USD)": number; "Monto Comisión (USD)": number; "Promotor ID": number; "Promotor Nombre": string; "Referral ID": number; "Referral Email": string; "Fecha Creación": string; "Mes Cohorte": string; Pagada: string; }
interface MonthlyReport { "Período": string; "Promotor ID": number; "Promotor Nombre": string; "Promotor Email": string; Revenue: number; "Revenue Neto": number; Comisiones: number; Clientes: number; Referrals: number; Clicks: number; Ventas: number; "Clientes Activos": number; }

// ============================================================
// CONSTANTS
// ============================================================
const COHORT_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#10B981', '#06B6D4', '#3B82F6', '#64748B'];
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const ESTADO_COLORS: Record<string, { bg: string; text: string }> = { active: { bg: "bg-emerald-50", text: "text-emerald-700" }, accepted: { bg: "bg-emerald-50", text: "text-emerald-700" }, subscribed: { bg: "bg-emerald-50", text: "text-emerald-700" }, signup: { bg: "bg-blue-50", text: "text-blue-700" }, cancelled: { bg: "bg-red-50", text: "text-red-700" }, refunded: { bg: "bg-orange-50", text: "text-orange-700" }, denied: { bg: "bg-gray-100", text: "text-gray-600" }, pending: { bg: "bg-yellow-50", text: "text-yellow-700" }, approved: { bg: "bg-emerald-50", text: "text-emerald-700" } };
const COLORS = { primary: '#6366F1', success: '#10B981', grayLight: '#9CA3AF', gridLine: '#F3F4F6' };
const MONTHS_ES: Record<string, string> = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };

export default function PromotoresPage() {
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [monthlyReport, setMonthlyReport] = useState<MonthlyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<"COP" | "USD">("USD");
    const [filterPromoter, setFilterPromoter] = useState<string>("");
    const [excludedPromoters, setExcludedPromoters] = useState<Set<number>>(new Set());
    const [showExcludeDropdown, setShowExcludeDropdown] = useState(false);
    const [cohortView, setCohortView] = useState<"pct" | "abs" | "revenue">("pct");
    const [heatmapFull, setHeatmapFull] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalReferrals, setModalReferrals] = useState<Referral[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/promoter");
            const result = await response.json();
            if (result.success) { setPromoters(result.promotores || []); setReferrals(result.referrals || []); setCommissions(result.comisiones || []); setMonthlyReport(result.reporteMensual || []); }
        } catch (err) { console.error("Error:", err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    // HELPERS
    const formatUSD = (value: number, compact = false) => { const a = Math.abs(value); if (compact && a >= 1e6) return `$${(a / 1e6).toFixed(1)}M`; if (compact && a >= 1e3) return `$${(a / 1e3).toFixed(1)}K`; return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(a); };
    const formatPercent = (v: number) => `${(v ?? 0).toFixed(1)}%`;
    const formatMonth = (m: string) => { if (!m || m === "Sin Fecha") return m; const [y, mo] = m.split("-"); return `${MONTHS_ES[mo] || mo} ${y?.slice(2) || ''}`; };
    const formatMonthFull = (m: string) => { if (!m || m === "Sin Fecha") return m; const [y, mo] = m.split("-"); return `${MONTHS_ES[mo] || mo} ${y}`; };
    const getRetentionColor = (pct: number, isLast: boolean): string => { if (!heatmapFull && !isLast) return 'bg-gray-100 text-gray-500'; if (pct >= 80) return 'bg-emerald-200 text-emerald-900'; if (pct >= 60) return 'bg-emerald-100 text-emerald-800'; if (pct >= 40) return 'bg-amber-100 text-amber-800'; if (pct >= 20) return 'bg-orange-200 text-orange-800'; return 'bg-rose-200 text-rose-800'; };

    // FIX #1: Real commissions from comisiones sheet
    const commissionsByPromoter = useMemo(() => { const m: Record<number, number> = {}; commissions.forEach(c => { const pid = c["Promotor ID"]; if (!pid) return; m[pid] = (m[pid] || 0) + (c["Monto Comisión (USD)"] || 0); }); return m; }, [commissions]);

    const visiblePromoters = useMemo(() => promoters.filter(p => !excludedPromoters.has(p.ID)), [promoters, excludedPromoters]);
    const rankedPromoters = useMemo(() => [...visiblePromoters].sort((a, b) => (b["Revenue (USD)"] || 0) - (a["Revenue (USD)"] || 0)), [visiblePromoters]);
    const toggleExclude = (id: number) => { setExcludedPromoters(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); if (filterPromoter === String(id)) setFilterPromoter(""); };

    const kpis = useMemo(() => {
        const totalRevenue = visiblePromoters.reduce((s, p) => s + (p["Revenue (USD)"] || 0), 0);
        const totalClicks = visiblePromoters.reduce((s, p) => s + (p.Clicks || 0), 0);
        const totalReferrals = visiblePromoters.reduce((s, p) => s + (p.Referrals || 0), 0);
        const totalVentas = visiblePromoters.reduce((s, p) => s + (p.Ventas || 0), 0);
        const totalClientes = visiblePromoters.reduce((s, p) => s + (p["Clientes Activos"] || 0), 0);
        const totalComisiones = visiblePromoters.reduce((s, p) => s + (commissionsByPromoter[p.ID] || 0), 0);
        const conversionRate = totalClicks > 0 ? (totalVentas / totalClicks) * 100 : 0;
        return { totalRevenue, totalClicks, totalReferrals, totalVentas, totalClientes, totalComisiones, conversionRate };
    }, [visiblePromoters, commissionsByPromoter]);

    const filteredReferrals = useMemo(() => { let r = referrals.filter(r => !excludedPromoters.has(r["Promotor ID"])); if (filterPromoter) r = r.filter(r => String(r["Promotor ID"]) === filterPromoter); return r; }, [referrals, filterPromoter, excludedPromoters]);
    const filteredCommissions = useMemo(() => { let r = commissions.filter(c => !excludedPromoters.has(c["Promotor ID"])); if (filterPromoter) r = r.filter(c => String(c["Promotor ID"]) === filterPromoter); return r; }, [commissions, filterPromoter, excludedPromoters]);

    // FIX #3: Funnel — Ventas BEFORE Clientes
    const funnel = useMemo(() => {
        if (filterPromoter) { const p = visiblePromoters.find(p => String(p.ID) === filterPromoter); if (!p) return { clicks: 0, referrals: 0, ventas: 0, customers: 0 }; return { clicks: p.Clicks || 0, referrals: p.Referrals || 0, ventas: p.Ventas || 0, customers: p["Clientes Activos"] || 0 }; }
        return { clicks: kpis.totalClicks, referrals: kpis.totalReferrals, ventas: kpis.totalVentas, customers: kpis.totalClientes };
    }, [visiblePromoters, filterPromoter, kpis]);

    // FIX #2: Cohort — matching key-metrics heatmap style
    // Only include referrals that BECAME CUSTOMERS (have "Cliente Desde")
    // Group by the month they became a customer, not when they signed up
    const cohortData = useMemo(() => {
        const grouped: Record<string, Referral[]> = {};
        filteredReferrals.forEach(r => {
            const clienteSince = r["Cliente Desde"];
            if (!clienteSince) return; // Skip signups that never converted
            // Extract YYYY-MM from the customer date
            let cohortMonth = "";
            try { const d = new Date(clienteSince); if (!isNaN(d.getTime())) cohortMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; } catch { }
            if (!cohortMonth) return;
            if (!grouped[cohortMonth]) grouped[cohortMonth] = [];
            grouped[cohortMonth].push(r);
        });
        const sortedCohorts = Object.keys(grouped).sort();
        if (sortedCohorts.length === 0) return [];
        const now = new Date();
        return sortedCohorts.map(cohort => {
            const refs = grouped[cohort];
            const totalUsers = refs.length; // Only actual customers
            const [cY, cM] = cohort.split("-").map(Number);
            const cohortDate = new Date(cY, cM - 1, 1);
            const monthsSinceCohort = Math.max(0, (now.getFullYear() - cohortDate.getFullYear()) * 12 + (now.getMonth() - cohortDate.getMonth()));
            const activeNow = refs.filter(r => { const e = (r.Estado || "").toLowerCase(); return e === "active" || e === "subscribed"; }).length;
            const retention: number[] = [];
            const retentionPct: number[] = [];
            for (let m = 0; m <= monthsSinceCohort; m++) {
                if (m === 0) { retention.push(totalUsers); retentionPct.push(100); }
                else if (m === monthsSinceCohort) { retention.push(activeNow); retentionPct.push(totalUsers > 0 ? Math.round((activeNow / totalUsers) * 1000) / 10 : 0); }
                else { const pct = monthsSinceCohort > 0 ? 100 - ((100 - (totalUsers > 0 ? (activeNow / totalUsers) * 100 : 0)) * (m / monthsSinceCohort)) : 100; retention.push(Math.round((pct / 100) * totalUsers)); retentionPct.push(Math.round(pct * 10) / 10); }
            }
            return { cohort, totalUsers, retention, retentionPct, activeNow, referrals: refs };
        });
    }, [filteredReferrals]);

    const cohortCurvesData = useMemo(() => {
        if (cohortData.length === 0) return { data: [] as Record<string, any>[], keys: [] as string[] };
        const sorted = [...cohortData].sort((a, b) => a.cohort.localeCompare(b.cohort));
        const maxLen = Math.max(...sorted.map(c => c.retentionPct.length));
        const data: Record<string, any>[] = [];
        for (let i = 0; i < maxLen; i++) { const pt: Record<string, any> = { month: `+${i}` }; sorted.forEach(c => { if (i < c.retentionPct.length) pt[c.cohort] = c.retentionPct[i]; }); data.push(pt); }
        return { data, keys: sorted.map(c => c.cohort) };
    }, [cohortData]);
    const maxCohortMonths = useMemo(() => Math.max(...cohortData.map(c => c.retentionPct.length), 0), [cohortData]);

    // Revenue cohort (commissions by month)
    const revenueCohort = useMemo(() => {
        const grouped: Record<string, { ventas: number; revenue: number; comision: number; approved: number }> = {};
        filteredCommissions.forEach(c => { const co = c["Mes Cohorte"] || "Sin Fecha"; if (!grouped[co]) grouped[co] = { ventas: 0, revenue: 0, comision: 0, approved: 0 }; grouped[co].ventas++; grouped[co].revenue += c["Monto Venta (USD)"] || 0; grouped[co].comision += c["Monto Comisión (USD)"] || 0; if ((c.Estado || "").toLowerCase() === "approved") grouped[co].approved++; });
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data, avgSale: data.ventas > 0 ? data.revenue / data.ventas : 0 }));
    }, [filteredCommissions]);
    const maxRevenueCohort = useMemo(() => Math.max(...revenueCohort.map(c => c.revenue), 1), [revenueCohort]);

    // Monthly trends
    const trendData = useMemo(() => {
        let data = monthlyReport.filter(r => !excludedPromoters.has(r["Promotor ID"]));
        if (filterPromoter) data = data.filter(r => String(r["Promotor ID"]) === filterPromoter);
        const grouped: Record<string, { revenue: number; clicks: number; referrals: number; ventas: number }> = {};
        data.forEach(r => { const p = r["Período"] || ""; if (!grouped[p]) grouped[p] = { revenue: 0, clicks: 0, referrals: 0, ventas: 0 }; grouped[p].revenue += r.Revenue || 0; grouped[p].clicks += r.Clicks || 0; grouped[p].referrals += r.Referrals || 0; grouped[p].ventas += r.Ventas || 0; });
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([period, d]) => ({ period, ...d }));
    }, [monthlyReport, filterPromoter, excludedPromoters]);

    const selectedPromoterName = filterPromoter ? promoters.find(p => String(p.ID) === filterPromoter)?.Nombre || "Promotor" : "Todos los promotores";

    function openCohortDetailFromCohort(cohort: { cohort: string; referrals: Referral[] }) { setModalTitle(`Referrals — Cohorte ${formatMonthFull(cohort.cohort)}`); setModalReferrals(cohort.referrals); setModalOpen(true); }

    if (loading) return (<div className="min-h-screen flex items-center justify-center"><div className="flex items-center gap-3 text-gray-500"><RefreshCw className="w-5 h-5 animate-spin" />Cargando datos de promotores...</div></div>);

    const maxTrendRevenue = Math.max(...trendData.map(d => d.revenue), 1);
    const maxTrendClicks = Math.max(...trendData.map(d => d.clicks), 1);

    return (
        <div className="min-h-screen bg-[#F7F7F8]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5"><h1 className="text-2xl font-semibold text-gray-900">Promotores Fluxi</h1><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">EMBAJADORES</span></div>
                        <p className="text-sm text-gray-500">{selectedPromoterName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} /></button>
                        {/* Exclude dropdown */}
                        <div className="relative">
                            <button onClick={() => setShowExcludeDropdown(!showExcludeDropdown)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${excludedPromoters.size > 0 ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}><Filter className="w-4 h-4" />{excludedPromoters.size > 0 ? `${excludedPromoters.size} oculto${excludedPromoters.size > 1 ? "s" : ""}` : "Filtrar"}<ChevronDown className="w-3 h-3" /></button>
                            {showExcludeDropdown && (<><div className="fixed inset-0 z-40" onClick={() => setShowExcludeDropdown(false)} /><div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"><div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"><span className="text-sm font-semibold text-gray-700">Mostrar / Ocultar</span>{excludedPromoters.size > 0 && <button onClick={() => setExcludedPromoters(new Set())} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Mostrar todos</button>}</div><div className="max-h-64 overflow-y-auto py-1">{promoters.sort((a, b) => (a.Nombre || a.Email).localeCompare(b.Nombre || b.Email)).map(p => { const isEx = excludedPromoters.has(p.ID); return (<button key={p.ID} onClick={() => toggleExclude(p.ID)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${isEx ? "opacity-50" : ""}`}>{isEx ? <EyeOff className="w-4 h-4 text-red-400 flex-shrink-0" /> : <Eye className="w-4 h-4 text-emerald-500 flex-shrink-0" />}<div className="min-w-0 flex-1"><p className={`text-sm font-medium truncate ${isEx ? "text-gray-400 line-through" : "text-gray-900"}`}>{p.Nombre || "Sin nombre"}</p><p className="text-xs text-gray-400 truncate">{p.Email}</p></div></button>); })}</div></div></>)}
                        </div>
                        <select value={filterPromoter} onChange={e => setFilterPromoter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"><option value="">Todos los promotores</option>{rankedPromoters.map(p => <option key={p.ID} value={String(p.ID)}>{p.Nombre || p.Email}</option>)}</select>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1"><button onClick={() => setCurrency("COP")} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === "COP" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>COP</button><button onClick={() => setCurrency("USD")} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === "USD" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>USD</button></div>
                    </div>
                </div>
            </header>

            <div className="p-8 space-y-6">
                {/* Ranking */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100"><div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /><h2 className="text-lg font-semibold text-gray-900">Ranking de Promotores</h2></div></div>
                    <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Promotor</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clicks</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Referrals</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Comisiones</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Clientes Activos</th>
                            <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {rankedPromoters.map((p, idx) => {
                                const es = ESTADO_COLORS[(p.Estado || "").toLowerCase()] || ESTADO_COLORS.pending; const realCom = commissionsByPromoter[p.ID] || 0; return (
                                    <tr key={p.ID} className={`hover:bg-gray-50 transition-colors cursor-pointer ${filterPromoter === String(p.ID) ? "bg-indigo-50" : ""}`} onClick={() => setFilterPromoter(filterPromoter === String(p.ID) ? "" : String(p.ID))}>
                                        <td className="px-6 py-4"><div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: idx < 3 ? `${MEDAL_COLORS[idx]}20` : "#F3F4F6", color: idx < 3 ? MEDAL_COLORS[idx] : "#6B7280" }}>{idx + 1}</div></td>
                                        <td className="px-6 py-4"><p className="font-medium text-gray-900">{p.Nombre || "Sin nombre"}</p><p className="text-xs text-gray-500">{p.Email}</p></td>
                                        <td className="text-right px-6 py-4 text-sm text-gray-700 font-medium">{(p.Clicks || 0).toLocaleString()}</td>
                                        <td className="text-right px-6 py-4 text-sm text-gray-700 font-medium">{(p.Referrals || 0).toLocaleString()}</td>
                                        <td className="text-right px-6 py-4 text-sm text-gray-700 font-medium">{(p.Ventas || 0).toLocaleString()}</td>
                                        <td className="text-right px-6 py-4 text-sm font-semibold text-gray-900">{formatUSD(p["Revenue (USD)"] || 0)}</td>
                                        <td className="text-right px-6 py-4 text-sm font-medium text-emerald-600">{formatUSD(realCom)}</td>
                                        <td className="text-right px-6 py-4 text-sm text-gray-700 font-medium">{(p["Clientes Activos"] || 0).toLocaleString()}</td>
                                        <td className="text-center px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${es.bg} ${es.text}`}>{p.Estado || "—"}</span></td>
                                    </tr>);
                            })}
                        </tbody>
                    </table>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-50 rounded-lg"><DollarSign className="w-5 h-5 text-indigo-600" /></div><span className="text-sm text-gray-500">Revenue Total</span></div><p className="text-2xl font-bold text-gray-900">{formatUSD(kpis.totalRevenue, true)}</p><p className="text-xs text-gray-400 mt-1">{formatUSD(kpis.totalRevenue)}</p></div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-sky-50 rounded-lg"><MousePointerClick className="w-5 h-5 text-sky-600" /></div><span className="text-sm text-gray-500">Total Clicks</span></div><p className="text-2xl font-bold text-gray-900">{kpis.totalClicks.toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">{kpis.totalReferrals} referrals generados</p></div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-50 rounded-lg"><UserCheck className="w-5 h-5 text-emerald-600" /></div><span className="text-sm text-gray-500">Total Ventas</span></div><p className="text-2xl font-bold text-gray-900">{kpis.totalVentas.toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">{kpis.totalClientes} clientes activos</p></div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-amber-50 rounded-lg"><TrendingUp className="w-5 h-5 text-amber-600" /></div><span className="text-sm text-gray-500">Conversión Click → Venta</span></div><p className="text-2xl font-bold text-gray-900">{formatPercent(kpis.conversionRate)}</p><p className="text-xs text-gray-400 mt-1">Comisiones: {formatUSD(kpis.totalComisiones)}</p></div>
                </div>

                {/* FIX #3: Funnel — Clicks → Referrals → Ventas → Clientes Activos */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Funnel de Conversión</h2>
                    <div className="flex items-center justify-between gap-2">
                        {[{ label: "Clicks", value: funnel.clicks, color: "#6366F1" }, { label: "Referrals", value: funnel.referrals, color: "#0EA5E9" }, { label: "Ventas", value: funnel.ventas, color: "#F59E0B" }, { label: "Clientes Activos", value: funnel.customers, color: "#22C55E" }].map((step, idx, arr) => {
                            const maxVal = arr[0].value || 1; const widthPct = Math.max((step.value / maxVal) * 100, 8); const prev = idx > 0 ? arr[idx - 1].value : 0; const conv = prev > 0 ? ((step.value / prev) * 100) : 0;
                            return (<React.Fragment key={step.label}>{idx > 0 && <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2"><ArrowRight className="w-5 h-5 text-gray-300" /><span className="text-xs font-semibold text-gray-500">{formatPercent(conv)}</span></div>}<div className="flex-1 text-center"><div className="mb-2"><p className="text-sm text-gray-500">{step.label}</p><p className="text-2xl font-bold text-gray-900">{step.value.toLocaleString()}</p></div><div className="mx-auto bg-gray-100 rounded-lg h-12 relative overflow-hidden"><div className="h-full rounded-lg transition-all" style={{ width: `${widthPct}%`, backgroundColor: step.color }} /></div></div></React.Fragment>);
                        })}
                    </div>
                </div>

                {/* Trend Chart */}
                {trendData.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Mensual — {selectedPromoterName}</h2>
                        <div className="flex items-end gap-2 h-64">{trendData.map(d => { const rH = (d.revenue / maxTrendRevenue) * 100; const cH = (d.clicks / maxTrendClicks) * 100; return (<div key={d.period} className="flex-1 flex flex-col items-center group"><div className="w-full flex items-end justify-center gap-1 h-52"><div className="w-5 rounded-t transition-all hover:opacity-80" style={{ height: `${Math.max(rH, d.revenue > 0 ? 2 : 0)}%`, backgroundColor: "#6366F1" }} title={`Revenue: ${formatUSD(d.revenue)}`} /><div className="w-5 rounded-t transition-all hover:opacity-80" style={{ height: `${Math.max(cH, d.clicks > 0 ? 2 : 0)}%`, backgroundColor: "#0EA5E9" }} title={`Clicks: ${d.clicks}`} /></div><div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-gray-600 mt-1 whitespace-nowrap">{formatUSD(d.revenue, true)}</div><span className="text-xs text-gray-500 mt-1">{d.period}</span></div>); })}</div>
                        <div className="flex items-center justify-center gap-6 mt-4"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: "#6366F1" }} /><span className="text-sm text-gray-600">Revenue</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: "#0EA5E9" }} /><span className="text-sm text-gray-600">Clicks</span></div></div>
                    </div>
                )}

                {/* FIX #2: Cohort Analysis — key-metrics style */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" /><h2 className="text-base font-semibold text-gray-900">Análisis de Cohortes — Retención de Clientes</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Cada fila = mes en que se hicieron clientes. Columnas = meses desde ingreso.</div></div></div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => setCohortView("pct")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === "pct" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Percent className="w-3 h-3" /> Porcentaje</button>
                                    <button onClick={() => setCohortView("abs")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === "abs" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Hash className="w-3 h-3" /> Absolutos</button>
                                    <button onClick={() => setCohortView("revenue")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${cohortView === "revenue" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><Banknote className="w-3 h-3" /> Revenue</button>
                                </div>
                                {cohortView !== "revenue" && <button onClick={() => setHeatmapFull(!heatmapFull)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${heatmapFull ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="w-3.5 h-3.5" /> Heatmap</button>}
                                {cohortView !== "revenue" && <div className="flex items-center gap-1 text-[10px]"><span className="text-gray-400 mr-1">Retención:</span><div className="w-5 h-3.5 bg-rose-200 rounded" /><div className="w-5 h-3.5 bg-orange-200 rounded" /><div className="w-5 h-3.5 bg-amber-100 rounded" /><div className="w-5 h-3.5 bg-emerald-100 rounded" /><div className="w-5 h-3.5 bg-emerald-200 rounded" /></div>}
                            </div>
                        </div>
                    </div>
                    {cohortView === "revenue" ? (
                        <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cohorte</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ventas</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue Total</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comisiones</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Venta Prom.</th><th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue vs Total</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">{revenueCohort.length === 0 ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No hay datos de ventas</td></tr>) : revenueCohort.map(c => (<tr key={c.month} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-3 font-medium text-gray-900">{formatMonthFull(c.month)}</td><td className="text-right px-4 py-3 text-sm font-semibold text-indigo-600">{c.ventas}</td><td className="text-right px-4 py-3 text-sm font-semibold text-gray-900">{formatUSD(c.revenue)}</td><td className="text-right px-4 py-3 text-sm font-medium text-emerald-600">{formatUSD(c.comision)}</td><td className="text-right px-4 py-3 text-sm text-gray-600">{formatUSD(c.avgSale)}</td><td className="px-6 py-3"><div className="flex items-center gap-2"><div className="flex-1 bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${(c.revenue / maxRevenueCohort) * 100}%` }} /></div><span className="text-xs text-gray-500 w-10 text-right">{formatPercent(maxRevenueCohort > 0 ? (c.revenue / maxRevenueCohort) * 100 : 0)}</span></div></td></tr>))}</tbody>
                            {revenueCohort.length > 0 && <tfoot className="bg-gray-100 font-semibold"><tr><td className="px-6 py-3 text-gray-900">TOTAL</td><td className="text-right px-4 py-3 text-indigo-600">{revenueCohort.reduce((s, c) => s + c.ventas, 0)}</td><td className="text-right px-4 py-3 text-gray-900">{formatUSD(revenueCohort.reduce((s, c) => s + c.revenue, 0))}</td><td className="text-right px-4 py-3 text-emerald-600">{formatUSD(revenueCohort.reduce((s, c) => s + c.comision, 0))}</td><td className="text-right px-4 py-3 text-gray-700">—</td><td className="px-6 py-3">—</td></tr></tfoot>}
                        </table>
                    ) : (
                        cohortData.length > 0 ? (
                            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="text-left py-3 px-4 font-medium text-gray-500 bg-gray-50/50 sticky left-0 z-10">Cohorte</th><th className="text-center py-3 px-3 font-medium text-gray-500 bg-gray-50/50">Clientes</th>{[...Array(maxCohortMonths)].map((_, i) => (<th key={i} className="text-center py-3 px-2 font-medium text-gray-500 bg-gray-50/50 min-w-[64px]">M{i}</th>))}</tr></thead>
                                <tbody>{cohortData.map((cohort, rowIdx) => (<tr key={cohort.cohort} className={`${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} hover:bg-gray-50/70 transition-colors cursor-pointer`} onClick={() => openCohortDetailFromCohort(cohort)}>
                                    <td className="py-2.5 px-4 font-medium text-gray-900 sticky left-0 z-10 bg-inherit whitespace-nowrap">{formatMonth(cohort.cohort)}</td>
                                    <td className="py-2.5 px-3 text-center font-semibold text-indigo-600 bg-gray-50/50">{cohort.totalUsers}</td>
                                    {[...Array(maxCohortMonths)].map((_, colIdx) => { const pct = cohort.retentionPct[colIdx]; const abs = cohort.retention[colIdx]; if (pct === undefined) return <td key={colIdx} className="py-2 px-1"><div className="w-full h-10 bg-gray-50/30 rounded-lg" /></td>; const isLast = colIdx === cohort.retentionPct.length - 1; const dv = cohortView === "pct" ? `${pct}%` : `${abs}`; return (<td key={colIdx} className="py-2 px-1"><div className={`w-full h-10 flex items-center justify-center text-xs font-semibold rounded-lg transition-all hover:scale-105 cursor-default ${getRetentionColor(pct, isLast)}`} title={`${abs} de ${cohort.totalUsers} (${pct}%)`}>{dv}</div></td>); })}
                                </tr>))}</tbody></table></div>
                        ) : (<div className="h-48 flex items-center justify-center text-gray-400">No hay datos de referrals para cohortes</div>)
                    )}
                </div>

                {/* Cohort Curves */}
                {cohortCurvesData.data.length > 0 && cohortView !== "revenue" && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-4 h-4 text-indigo-600" /><h2 className="text-base font-semibold text-gray-900">Curvas de Retención por Cohorte</h2><div className="group relative"><Info className="w-4 h-4 text-gray-400 cursor-help" /><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">Si las cohortes recientes están por encima, la retención mejora.</div></div></div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={cohortCurvesData.data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.gridLine} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.grayLight, fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} dx={-10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }} formatter={(val: number | undefined, name: string | undefined) => [`${(val ?? 0).toFixed(1)}%`, formatMonth(name || '')]} />
                                    <Legend content={({ payload }: any) => { const sorted = [...(payload || [])].sort((a: any, b: any) => (a.dataKey || '').localeCompare(b.dataKey || '')); return (<div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3">{sorted.map((e: any) => (<div key={e.dataKey} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-[11px] text-gray-500">{formatMonth(e.dataKey)}</span></div>))}</div>); }} />
                                    {cohortCurvesData.keys.map((key, idx) => (<Line key={key} dataKey={key} stroke={COHORT_COLORS[idx % COHORT_COLORS.length]} strokeWidth={2} dot={{ r: 3, fill: COHORT_COLORS[idx % COHORT_COLORS.length], strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls />))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"><div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button></div><div className="overflow-auto max-h-[60vh]"><table className="w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr><th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th><th className="text-left px-4 py-3 font-semibold text-gray-700">Promotor</th><th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th><th className="text-left px-4 py-3 font-semibold text-gray-700">Fuente</th><th className="text-left px-4 py-3 font-semibold text-gray-700">Creación</th><th className="text-left px-4 py-3 font-semibold text-gray-700">Cliente Desde</th></tr></thead><tbody className="divide-y divide-gray-100">{modalReferrals.map((r, idx) => { const es = ESTADO_COLORS[(r.Estado || "").toLowerCase()] || ESTADO_COLORS.pending; return (<tr key={idx} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-900">{r.Email}</td><td className="px-4 py-3 text-gray-600">{r["Promotor Nombre"]}</td><td className="text-center px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${es.bg} ${es.text}`}>{r.Estado}</span></td><td className="px-4 py-3 text-gray-500">{r.Fuente}</td><td className="px-4 py-3 text-gray-600">{r["Fecha Creación"] ? new Date(r["Fecha Creación"]).toLocaleDateString("es-CO") : "—"}</td><td className="px-4 py-3 text-gray-600">{r["Cliente Desde"] ? new Date(r["Cliente Desde"]).toLocaleDateString("es-CO") : "—"}</td></tr>); })}</tbody></table></div><div className="px-6 py-4 border-t border-gray-200 bg-gray-50"><p className="text-sm text-gray-500">{modalReferrals.length} referrals | <span className="text-emerald-600 font-medium">{modalReferrals.filter(r => ["active", "subscribed"].includes((r.Estado || "").toLowerCase())).length} activos</span> | <span className="text-red-500 font-medium">{modalReferrals.filter(r => (r.Estado || "").toLowerCase() === "cancelled").length} cancelados</span></p></div></div></div>)}
        </div>
    );
}