'use client';

import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage, units } from './api';

type Records<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: T };

export function useRecords<T>(path: string, refreshKey?: number) {
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
  }, [path, revision, refreshKey]);

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

const rowLimits = [5, 10, 25, 50];

function TablePager({ label, placement, framed, tableId, page, pageCount, onChange }: {
  label: string;
  placement: 'top' | 'bottom';
  framed: boolean;
  tableId: string;
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const location = placement === 'top' ? 'arriba' : 'abajo';
  return <nav className={`record-table-pager record-table-pager-${placement}${framed ? ' record-table-pager-framed' : ''}`}
    aria-label={`Páginas de ${label.toLocaleLowerCase('es-PE')} · ${location}`}>
    <button className="button button-icon" type="button" aria-label="Página anterior" aria-controls={tableId}
      disabled={page <= 1} onClick={() => onChange(page - 1)}>
      <ChevronLeft aria-hidden="true" size={18} />
    </button>
    {pageCount > 0 ? <>
      <label className="record-table-page">
        Página
        <span className="select-wrap">
          <select className="input data" aria-controls={tableId} value={page} disabled={pageCount === 1}
            onChange={(event) => onChange(Number(event.currentTarget.value))}>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((option) => <option key={option} value={option}>{units.format(option)}</option>)}
          </select>
          <SelectIcon />
        </span>
      </label>
      <span className="muted data">de {units.format(pageCount)}</span>
    </> : <span className="record-table-no-pages muted">Sin páginas</span>}
    <button className="button button-icon" type="button" aria-label="Página siguiente" aria-controls={tableId}
      disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
      <ChevronRight aria-hidden="true" size={18} />
    </button>
  </nav>;
}

export function RecordTable<T>({ rows, label, title, search, searchTerm, children, scrollClassName, empty }: {
  rows: readonly T[];
  label: string;
  title?: string;
  search?: ReactNode;
  searchTerm?: string;
  children: (visibleRows: readonly T[]) => ReactNode;
  scrollClassName?: string;
  empty?: ReactNode;
}) {
  const [limit, setLimit] = useState<number | 'all'>(rowLimits[0]);
  const [position, setPosition] = useState({ searchTerm, page: 1 });
  const tableId = useId();
  const tableRegion = useRef<HTMLDivElement>(null);
  const pageCount = limit === 'all' ? 1 : Math.max(1, Math.ceil(rows.length / limit));
  const page = position.searchTerm === searchTerm ? Math.min(position.page, pageCount) : 1;
  if (position.searchTerm !== searchTerm || position.page !== page) setPosition({ searchTerm, page });

  const start = limit === 'all' ? 0 : (page - 1) * limit;
  const end = limit === 'all' ? rows.length : Math.min(start + limit, rows.length);
  const visibleRows = rows.slice(start, end);
  const range = end === start + 1 ? units.format(end) : `${units.format(start + 1)}–${units.format(end)}`;
  const summary = rows.length === 0 ? '0 registros'
    : `${range} de ${units.format(rows.length)} ${rows.length === 1 ? 'registro' : 'registros'}`;
  const toolbarClass = ['record-table-toolbar', title && 'record-table-titled', search && 'record-table-searchable']
    .filter(Boolean).join(' ');
  const pagerProps = {
    label, framed: Boolean(title), tableId, page, pageCount: rows.length ? pageCount : 0,
    onChange: (nextPage: number) => setPosition({ searchTerm, page: nextPage }),
  };

  useEffect(() => {
    tableRegion.current?.scrollTo({ top: 0 });
  }, [limit, page, searchTerm]);

  return <>
    <div className={toolbarClass}>
      {title && <h2 className="record-table-title">{title}</h2>}
      <p className="record-table-count muted data" role="status">{summary}</p>
      {search && <div className="record-table-search">{search}</div>}
      <label className="record-table-limit">
        Filas visibles
        <span className="select-wrap">
          <select className="input data" aria-controls={tableId} value={limit} onChange={(event) => {
            const value = event.currentTarget.value;
            setLimit(value === 'all' ? 'all' : Number(value));
            setPosition({ searchTerm, page: 1 });
          }}>
            {rowLimits.map((size) => <option key={size} value={size}>{units.format(size)}</option>)}
            <option value="all">Todas</option>
          </select>
          <SelectIcon />
        </span>
      </label>
    </div>
    <TablePager {...pagerProps} placement="top" />
    {!rows.length && empty !== undefined ? <div id={tableId}>{empty}</div>
      : <div className={scrollClassName ? `scroll-table ${scrollClassName}` : 'scroll-table'} id={tableId} ref={tableRegion} tabIndex={0} role="region" aria-label={label}>
        {children(visibleRows)}
      </div>}
    <TablePager {...pagerProps} placement="bottom" />
  </>;
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
  return <label className="relative block w-full">
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
