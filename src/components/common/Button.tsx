import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'mint' | 'rose' | 'lavender' | 'cream' | 'coral' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-[#FFFDF5] text-black border-2 border-black hover:bg-[#FFF3C4]',
    secondary: 'bg-black text-white border-2 border-black hover:bg-neutral-800',
    mint: 'bg-[#C8E6C9] text-black border-2 border-black hover:bg-[#B9DFBA]',
    rose: 'bg-[#FFCDD2] text-black border-2 border-black hover:bg-[#F8BCC3]',
    lavender: 'bg-[#D1C4E9] text-black border-2 border-black hover:bg-[#C4B5E2]',
    cream: 'bg-[#FFF3C4] text-black border-2 border-black hover:bg-[#FEECA1]',
    coral: 'bg-[#FF2A5F] text-white border-2 border-black hover:bg-[#E01E50]',
    ghost: 'bg-transparent text-black border-2 border-transparent hover:bg-black/5 shadow-none',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs font-semibold rounded-lg',
    md: 'px-3.5 py-1.5 text-sm font-semibold rounded-xl',
    lg: 'px-5 py-2.5 text-base font-bold rounded-2xl',
  };

  const shadowStyle = variant === 'ghost' ? '' : 'neo-shadow neo-btn';
  const disabledStyle = disabled ? 'opacity-40 cursor-not-allowed hover:bg-inherit active:translate-x-0 active:translate-y-0 active:shadow-none' : '';

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 font-sans select-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${shadowStyle} ${disabledStyle} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
