import React from 'react';
import { Search } from 'lucide-react';

export const panel = 'bg-white rounded-xl border border-neutral-200';
export const darkInput = 'w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-white/15 text-white text-xs';
export const th = 'py-3.5 px-4';
export const td = 'py-3.5 px-4';

export const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold font-display">{title}</h1>
      {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`px-4 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#c38a30] whitespace-nowrap disabled:opacity-50 ${className}`}
  />
);

export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({
  value,
  onChange,
  placeholder,
}) => (
  <div className="relative w-full sm:w-80">
    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
    <input
      type="search"
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-neutral-200 text-xs focus:outline-none focus:border-[#D49A3D]"
    />
  </div>
);

export const Field: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({
  label,
  htmlFor,
  children,
}) => (
  <div>
    <label htmlFor={htmlFor} className="block text-neutral-300 mb-1">
      {label}
    </label>
    {children}
  </div>
);

export const ModalActions: React.FC<{ onCancel: () => void; submitLabel: string; busy?: boolean }> = ({
  onCancel,
  submitLabel,
  busy,
}) => (
  <div className="flex justify-end gap-3 pt-2">
    <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/15 text-neutral-300">
      Annuler
    </button>
    <button type="submit" disabled={busy} className="px-5 py-2 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold disabled:opacity-60">
      {submitLabel}
    </button>
  </div>
);

/** Délai avant recherche serveur pendant la saisie. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
