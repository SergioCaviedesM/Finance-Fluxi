"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

interface HeaderProps {
    title?: string;
    subtitle?: string;
}

export default function Header({ title = "Welcome, Sergio", subtitle = "Aquí está tu resumen financiero" }: HeaderProps) {
    const [currency, setCurrency] = useState<"COP" | "USD">("COP");
    const [dateRange, setDateRange] = useState("Últimos 30 días");

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Date Range Selector */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <Calendar className="w-4 h-4" />
                        {dateRange}
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Currency Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setCurrency("COP")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === "COP"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            COP
                        </button>
                        <button
                            onClick={() => setCurrency("USD")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currency === "USD"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            USD
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}