'use client';

import { Activity, Boxes, ClipboardList, LogOut, PackagePlus, ShoppingBag, UserRound } from 'lucide-react';
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
    <span className="brand-mark"><Activity aria-hidden="true" size={22} strokeWidth={2.3} /></span>
    <span>Inventario HCE</span>
  </a>;
}

function SessionControls({ username, loggingOut, logout, mobile }: {
  username: string;
  loggingOut: boolean;
  logout: () => void;
  mobile?: boolean;
}) {
  return <div className={`workspace-account ${mobile ? 'workspace-account-mobile' : 'workspace-account-desktop'}`}>
    <div className="workspace-user" title={username}>
      <span className="workspace-avatar"><UserRound aria-hidden="true" size={16} /></span>
      <span className="workspace-username">{username}</span>
    </div>
    <button className="workspace-logout" type="button" onClick={logout} disabled={loggingOut}>
      <LogOut aria-hidden="true" size={16} /> {loggingOut ? 'Saliendo…' : 'Salir'}
    </button>
  </div>;
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
    <header className="topbar workspace-header">
      <div className="container-hce workspace-topbar">
        <a className="workspace-skip" href="#contenido">Ir al contenido</a>
        <Brand />
        {session && <>
          <SessionControls username={session.username} loggingOut={loggingOut} logout={logout} mobile />
          <nav className="module-nav" aria-label="Módulos">
            {destinations.map(({ href, label, icon: Icon }) => <a key={href} className="nav-link" href={href} aria-current={current === href ? 'page' : undefined}>
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </a>)}
          </nav>
          <SessionControls username={session.username} loggingOut={loggingOut} logout={logout} />
        </>}
      </div>
    </header>
    <main id="contenido" className="container-hce py-8 sm:py-10" tabIndex={-1}>
      {loading && <div role="status" className="panel p-5">Comprobando sesión…</div>}
      {!loading && error && <div className="notice notice-error mb-4" role="alert">
        {error}
        {!session && <button className="button ml-3" type="button" onClick={() => { setError(''); setLoading(true); setAttempt((n) => n + 1); }}>Reintentar</button>}
      </div>}
      {session && children}
    </main>
  </>;
}
