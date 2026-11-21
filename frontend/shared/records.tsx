'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage } from './api';

type Records<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: T };

export function useRecords<T>(path: string) {
  const [records, setRecords] = useState<Records<T>>({ state: 'loading' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get<T>(path, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setRecords({ state: 'ready', data });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setRecords({ state: 'error', message: errorMessage(reason) });
      });
    return () => controller.abort();
  }, [path, revision]);

  return {
    records,
    retry: () => {
      setRecords({ state: 'loading' });
      setRevision((n) => n + 1);
    },
    refresh: () => setRevision((n) => n + 1),
    replace: (data: T) => setRecords({ state: 'ready', data }),
  };
}

export function LoadState<T>({ records, retry, children }: {
  records: Records<T>;
  retry: () => void;
  children: (data: T) => ReactNode;
}) {
  if (records.state === 'ready') return children(records.data);
  if (records.state === 'error') return <div className="p-5">
    <p className="notice notice-error" role="alert">{records.message}</p>
    <button className="button mt-3" type="button" onClick={retry}>Reintentar</button>
  </div>;
  return <div className="grid gap-3 p-5" role="status">
    <span className="sr-only">Cargando registros…</span>
    {[0, 1, 2].map((row) => <div key={row} className="grid grid-cols-3 gap-5" aria-hidden="true">
      <span className="skeleton" /><span className="skeleton" /><span className="skeleton" />
    </div>)}
  </div>;
}

export function Dialog({ title, subtitle, wide, busy, onClose, children }: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return <dialog ref={ref} className={wide ? 'dialog-hce movement-dialog' : 'dialog-hce'} aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => {
      if (busy || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="pt-1">
        <h2 id="dialog-title">{title}</h2>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      <button type="button" className="button button-icon" aria-label="Cerrar" onClick={onClose} disabled={busy}><X aria-hidden="true" size={18} /></button>
    </div>
    {children}
  </dialog>;
}

export function SelectIcon() {
  return <ChevronDown aria-hidden="true" size={17} />;
}

export function SearchField({ value, onChange, label }: {
  value: string;
  onChange: (term: string) => void;
  label: string;
}) {
  return <label className="relative block w-full sm:w-64">
    <span className="sr-only">{label}</span>
    <Search className="muted pointer-events-none absolute top-3.5 left-3" aria-hidden="true" size={17} />
    <input className="input pl-9" name="q" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} />
  </label>;
}

export function useSearchTerm() {
  const [term, setTerm] = useState('');
  useEffect(() => {
    function read() { setTerm(new URL(window.location.href).searchParams.get('q') ?? ''); }
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  return [term, (value: string) => {
    setTerm(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url);
  }] as const;
}
