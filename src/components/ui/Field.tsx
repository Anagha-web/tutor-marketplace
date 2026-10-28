import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-slate-100 disabled:text-slate-500';

function controlClass(error?: string) {
  return `${control} ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-brand-500'}`;
}

interface WrapperProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
}

function FieldWrapper({ label, error, hint, required, children, className = '' }: WrapperProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600" aria-hidden> *</span>}
      </label>
      {children({ id, describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: ReactNode; wrapperClassName?: string };

export function TextField({ label, error, hint, wrapperClassName, required, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          className={controlClass(error)}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

export function TextAreaField({ label, error, hint, wrapperClassName, required, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          className={`${controlClass(error)} min-h-24`}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  error,
  hint,
  wrapperClassName,
  required,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          className={controlClass(error)}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}

export function Checkbox({ label, error, ...rest }: { label: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
          {...rest}
        />
        <label htmlFor={id} className="text-sm text-slate-600">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
