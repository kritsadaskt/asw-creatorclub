interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'outline' | 'accent' | 'successTransparent' | 'errorTransparent' | 'success' | 'error' | 'ghost';
  fullWidth?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  center?: boolean;
  width?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  size = 'md',
  className = '',
  center = false,
  rounded = 'md'
}: ButtonProps) {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5',
    lg: 'px-8 py-3 text-lg'
  };
  
  const baseStyles = 'rounded-lg transition-colors cursor-pointer';
  
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
    accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
    success: 'bg-green-600 text-white hover:bg-green-600/70',
    error: 'bg-red-600 text-white hover:bg-red-600/70',
    successTransparent: 'bg-transparent text-green-500 hover:bg-green-500/10',
    errorTransparent: 'bg-transparent text-red-500 hover:bg-red-500/10',
    ghost: 'text-foreground hover:bg-muted hover:text-neutral-800',
  };

  const widthStyles = fullWidth ? 'w-full' : '';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const centerStyles = center ? 'flex items-center gap-2 justify-center' : '';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${disabledStyles} ${centerStyles} ${className}`}
    >
      {children}
    </button>
  );
}