'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';

type Currency = 'COP' | 'USD';

interface SelectorMonedaProps {
    onCurrencyChange?: (currency: Currency) => void;
}

export default function SelectorMoneda({ onCurrencyChange }: SelectorMonedaProps) {
    const [currency, setCurrency] = useState<Currency>('COP');

    const handleChange = (newCurrency: Currency) => {
        setCurrency(newCurrency);
        onCurrencyChange?.(newCurrency);
    };

    return (
        <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <select
                value={currency}
                onChange={(e) => handleChange(e.target.value as Currency)}
                className="
          px-3 py-2 rounded-lg border border-gray-200 
          bg-white text-sm font-medium text-gray-700
          focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent
          cursor-pointer transition-all
        "
            >
                <option value="COP">COP - Peso Colombiano</option>
                <option value="USD">USD - Dólar</option>
            </select>
        </div>
    );
}
