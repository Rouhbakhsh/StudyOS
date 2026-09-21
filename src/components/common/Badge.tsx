import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'rose' | 'lavender' | 'cream' | 'indigo' | 'coral' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const variantStyles = {
    mint: 'bg-[#C8E6C9] text-black border-black/20',
    rose: 'bg-[#FFCDD2] text-black border-black/20',
    lavender: 'bg-[#D1C4E9] text-black border-black/20',
    cream: 'bg-[#FFF3C4] text-black border-black/20',
    indigo: 'bg-[#312E81] text-white border-transparent',
    coral: 'bg-[#FF2A5F] text-white border-transparent',
    neutral: 'bg-black/5 text-black border-black/15',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-mono font-medium',
    md: 'px-2.5 py-1 text-xs font-mono font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
