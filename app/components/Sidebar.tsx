"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Home,
    Receipt,
    Wallet,
    TrendingUp,
    PieChart,
    Menu,
    X,
    Users
} from "lucide-react";

const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Transacciones", href: "/transacciones", icon: Receipt },
];

const analytics = [
    { name: "Dashboard Saldos", href: "/saldos", icon: Wallet },
    { name: "Flujo de Caja", href: "/flujo-caja", icon: TrendingUp },
    { name: "Análisis de Gastos", href: "/gastos", icon: PieChart },
    { name: "Suscriptores", href: "/suscriptores", icon: Users },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(false);

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Sidebar with hover expand (Desktop behavior everywhere) */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-200 peer ${isExpanded ? 'w-56 shadow-xl' : 'w-16'
                    }`}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
            >
                {/* Logo */}
                <div className={`p-2 border-b border-gray-100 flex items-center justify-center h-16`}>
                    {isExpanded ? (
                        <Image
                            src="/images/logo1.webp"
                            alt="Fluxi"
                            width={130}
                            height={38}
                            className="object-contain"
                        />
                    ) : (
                        <Image
                            src="/images/logo2.webp"
                            alt="Fluxi"
                            width={44}
                            height={44}
                            className="object-contain"
                        />
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 overflow-x-hidden overflow-y-auto">
                    <div className={`transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'} h-6 mb-2 flex items-center`}>
                        {isExpanded && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Principal</p>}
                    </div>

                    <div className="space-y-1 mb-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "bg-blue-50 text-[#0EA5E9]" : "text-gray-600 hover:bg-gray-50"
                                    } ${!isExpanded ? 'justify-center' : ''}`}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {isExpanded && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
                            </Link>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                        <div className={`transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'} h-6 mb-2 flex items-center`}>
                            {isExpanded && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Análisis</p>}
                        </div>
                        <div className="space-y-1">
                            {analytics.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "bg-blue-50 text-[#0EA5E9]" : "text-gray-600 hover:bg-gray-50"
                                        } ${!isExpanded ? 'justify-center' : ''}`}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {isExpanded && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
                                </Link>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* Footer */}
                {isExpanded && (
                    <div className="p-4 border-t border-gray-100 whitespace-nowrap overflow-hidden">
                        <p className="text-xs text-gray-400 text-center">© 2025 Fluxi</p>
                    </div>
                )}
            </aside>
        </>
    );
}
