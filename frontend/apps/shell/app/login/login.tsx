'use client';

import { LogIn } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, errorMessage } from '@hce/api';
import { Brand } from '@hce/workspace';

const allowedDestinations = new Set(['/productos', '/operaciones/compras', '/operaciones/ventas', '/operaciones/kardex']);

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    setRequired(new URLSearchParams(window.location.search).has('session'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/login', { username: username.trim(), password });
      const target = new URLSearchParams(window.location.search).get('next') ?? '';
      window.location.replace(allowedDestinations.has(target) ? target : '/operaciones/kardex');
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401 ? 'El usuario o la contraseña son incorrectos.' : errorMessage(reason));
      setSubmitting(false);
    }
  }

  return <>
    <header className="topbar">
      <div className="container-hce flex min-h-16 items-center"><Brand /></div>
    </header>
    <main className="container-hce login-main">
      <form className="login-form panel grid gap-5 p-6 sm:p-8" method="post" onSubmit={submit}>
        <div>
          <h1>Iniciar sesión</h1>
          <p className="muted mt-2">Accede al inventario de insumos médicos.</p>
        </div>
        {required && !error && <p className="notice" role="status">Inicia sesión para continuar.</p>}
        <label className="field">
          <span className="label">Usuario</span>
          <input className="input" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required disabled={submitting} />
        </label>
        <label className="field">
          <span className="label">Contraseña</span>
          <input className="input" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={submitting} />
        </label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={submitting}>
          <LogIn aria-hidden="true" size={17} /> {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  </>;
}
