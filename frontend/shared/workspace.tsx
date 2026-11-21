'use client';

import { Activity, Boxes, ClipboardList, LogOut, PackagePlus, ShoppingBag } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, errorMessage, type Session } from './api';

const destinations = [
  { href: '/productos', label: 'Productos', icon: Boxes },
  { href: '/operaciones/compras', label: 'Compras', icon: PackagePlus },
  { href: '/operaciones/ventas', label: 'Ventas', icon: ShoppingBag },
  { href: '/operaciones/kardex', label: 'Kardex', icon: ClipboardList },
];

export function Brand() {
  return <a className="brand" href="/">
    <span className="brand-mark"><Activity aria-hidden="true" size={21} strokeWidth={2.4} /></span>
    <span>Inventario HCE</span>
  </a>;
}

export function Workspace({ current, children }: { current: string; children: ReactNode }) {
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Session>('/auth/session', { signal: controller.signal })
      .then(({ data }) => setSession(data))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  async function logout() {
    setLoggingOut(true);
    setError('');
    try {
      await api.post('/auth/logout', {});
      window.location.replace('/login');
    } catch (reason) {
      setError(errorMessage(reason));
      setLoggingOut(false);
    }
  }

  return <>
    <header className="topbar">
      <div className="container-hce flex min-h-16 flex-wrap items-center justify-between gap-x-4 py-2">
        <Brand />
        {session && <>
          <nav className="flex items-center gap-1" aria-label="Módulos">
            {destinations.map(({ href, label, icon: Icon }) => <a key={href} className="nav-link" href={href} aria-current={current === href ? 'page' : undefined}>
              <Icon aria-hidden="true" size={17} />
              {label}
            </a>)}
          </nav>
          <div className="flex items-center gap-2">
            <span className="muted hidden text-sm lg:inline">{session.username}</span>
            <button className="quiet" type="button" onClick={logout} disabled={loggingOut}>
              <LogOut aria-hidden="true" size={16} /> {loggingOut ? 'Saliendo…' : 'Salir'}
            </button>
          </div>
        </>}
      </div>
    </header>
    <main id="contenido" className="container-hce py-8 sm:py-10">
      {loading && <div role="status" className="panel p-5">Comprobando sesión…</div>}
      {!loading && error && <div className="notice notice-error mb-4" role="alert">
        {error}
        {!session && <button className="button ml-3" type="button" onClick={() => { setError(''); setLoading(true); setAttempt((n) => n + 1); }}>Reintentar</button>}
      </div>}
      {session && children}
    </main>
  </>;
}
