import { useState } from 'react';
import { initials } from '../../lib/format';

const palette = ['bg-brand-100 text-brand-800', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-rose-100 text-rose-800'];

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [failed, setFailed] = useState(false);
  const dims = { sm: 'size-9 text-xs', md: 'size-14 text-base', lg: 'size-20 text-xl', xl: 'size-28 text-3xl' }[size];
  if (src && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} className={`${dims} shrink-0 rounded-full object-cover ring-2 ring-white`} />;
  }
  return (
    <span aria-hidden className={`${dims} ${colorFor(name)} inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white`}>
      {initials(name)}
    </span>
  );
}
