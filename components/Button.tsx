import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const LoadingSpinner = ({ size = 'md' }: { size?: ButtonSize }) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      ></circle>
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { 
      className = '', 
      variant = 'primary', 
      size = 'md', 
      isLoading = false, 
      leftIcon, 
      rightIcon, 
      children, 
      disabled, 
      ...props 
    }, 
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-black uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-brand-primary text-white hover:bg-brand-primary-dark shadow-xl shadow-brand-primary/20 focus:ring-brand-primary',
      secondary: 'bg-white text-foreground hover:bg-slate-50 border border-border shadow-sm focus:ring-slate-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700',
      outline: 'bg-transparent border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 focus:ring-brand-primary',
      ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 focus:ring-slate-200',
      danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 focus:ring-red-500',
    };

    const sizes = {
      sm: 'text-[9px] px-3 py-2 gap-1.5',
      md: 'text-[10px] px-6 py-3.5 gap-2',
      lg: 'text-xs px-8 py-4 gap-3',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <LoadingSpinner size={size} />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
