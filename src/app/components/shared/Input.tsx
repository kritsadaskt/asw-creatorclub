interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function Input({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  required = false 
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
