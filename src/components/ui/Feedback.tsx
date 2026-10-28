import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { friendlyError } from '../../lib/errors';
import { Button } from './Button';

type Tone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-brand-200 bg-brand-50 text-brand-900', icon: <Info className="size-5 shrink-0" aria-hidden /> },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden /> },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: <TriangleAlert className="size-5 shrink-0" aria-hidden /> },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: <AlertCircle className="size-5 shrink-0" aria-hidden /> },
};

export function Alert({ tone = 'info', title, children, className = '' }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 text-sm ${tones[tone].box} ${className}`}>
      {tones[tone].icon}
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="size-5 animate-spin text-brand-600" aria-hidden />
      <span>{label}…</span>
    </span>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center py-10">
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-700">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Could not load this content' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert tone="error" title={title}>
      <p>{friendlyError(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  );
}
