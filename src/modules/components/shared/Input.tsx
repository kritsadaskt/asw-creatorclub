import type { ReactNode } from 'react';
import { useId } from 'react';

interface InputProps {
  label: string;
  type?: string;
  icon?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  hideLabel?: boolean;
  onBlur?: () => void;
  error?: string;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
}

export function Input({
  label,
  type = 'text',
  value,
  className = '',
  id,
  onChange,
  placeholder,
  required = false,
  hideLabel = false,
  icon,
  onBlur,
  error,
  rightIcon,
  onRightIconClick,
}: InputProps) {
  // Deterministic across SSR + hydration (fixes "id/htmlFor did not match" warnings).
  const reactId = useId();
  const resolvedId = id ?? `input-${reactId.replace(/:/g, '')}`;

  return (
    <div className="pt-4">
      <div className="wrapper relative">
        {icon && (
          <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {rightIcon}
          </button>
        )}
        <input
          id={resolvedId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          //placeholder={placeholder ?? ' '}
          required={required}
          className={`peer w-full border-b border-neutral-400 bg-input-background px-0 pb-1.5 pt-2.5 text-foreground focus:border-primary focus:outline-none ${icon ? 'pl-7' : ''} ${className} ${hideLabel ? 'pt-0' : 'pt-6'}`}
        />
        <label
          htmlFor={resolvedId}
          className={`pointer-events-none absolute ${icon ? 'left-7' : 'left-0'} top-5 origin-left transform text-neutral-400 font-normal transition-all duration-150
          peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-neutral-500
          peer-focus:-top-1 peer-focus:text-sm peer-focus:text-primary
          ${value ? '!-top-1 text-primary' : ''} ${hideLabel ? 'hidden' : ''}`}
        >
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      </div>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
