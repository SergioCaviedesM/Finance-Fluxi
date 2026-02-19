import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hover?: boolean;
}

export default function Card({ children, className, onClick, hover = false }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'bg-white rounded-lg border border-gray-200 p-6',
                'shadow-[0_1px_3px_0_rgb(0_0_0_/0.05)]',
                hover && 'hover:shadow-md transition-shadow cursor-pointer',
                onClick && 'cursor-pointer',
                className
            )}
        >
            {children}
        </div>
    );
}
