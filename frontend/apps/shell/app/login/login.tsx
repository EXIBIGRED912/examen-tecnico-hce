'use client';

import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, errorMessage } from '@hce/api';
import { Brand } from '@hce/workspace';

const allowedDestinations = new Set(['/productos', '/operaciones/compras', '/operaciones/ventas', '/operaciones/kardex']);

interface LoginError {
  message: string;
  invalidCredentials: boolean;
  attempts?: { remaining: number; limit: number };
}

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<LoginError>();
  const [submitting, setSubmitting] = useState(false);
  const [required, setRequired] = useState(false);
  const [retry, setRetry] = useState<{ until: number; seconds: number }>();
  const retryUntil = retry?.until;
  const invalidCredentials = error?.invalidCredentials || undefined;
  const credentialsErrorId = invalidCredentials ? 'login-error' : undefined;

  useEffect(() => {
    setRequired(new URLSearchParams(window.location.search).has('session'));
  }, []);

  useEffect(() => {
    if (retryUntil === undefined) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
      setRetry(seconds > 0 ? { until: retryUntil, seconds } : undefined);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || (retryUntil !== undefined && retryUntil > Date.now())) return;
    setError(undefined);
    setRetry(undefined);
    setPasswordVisible(false);
    setSubmitting(true);
    try {
      await api.post('/auth/login', { username: username.trim(), password });
      const target = new URLSearchParams(window.location.search).get('next') ?? '';
      window.location.replace(allowedDestinations.has(target) ? target : '/operaciones/kardex');
    } catch (reason) {
      const apiError = reason instanceof ApiError ? reason : undefined;
      const { limit, remaining, retryAfter } = apiError?.rateLimit ?? {};
      setSubmitting(false);
      if (apiError?.status === 429 && retryAfter !== undefined && retryAfter > 0) {
        setRetry({ until: Date.now() + retryAfter * 1000, seconds: retryAfter });
        return;
      }

      const invalidCredentials = apiError?.status === 401;
      setError({
        invalidCredentials,
        message: invalidCredentials
          ? 'El usuario o la contraseña son incorrectos. Revisa los datos y vuelve a intentar.'
          : errorMessage(reason),
        attempts: invalidCredentials && limit !== undefined && remaining !== undefined ? { limit, remaining } : undefined,
      });
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
        {required && !error && !retry && <p className="notice" role="status">Inicia sesión para continuar.</p>}
        <label className="field">
          <span className="label">Usuario</span>
          <input
            className="input" name="username" autoComplete="username" value={username}
            aria-invalid={invalidCredentials} aria-describedby={credentialsErrorId}
            onChange={(event) => { setUsername(event.target.value); setError(undefined); }}
            maxLength={120} required disabled={submitting}
          />
        </label>
        <div className="field">
          <label className="label" htmlFor="login-password">Contraseña</label>
          <div className="login-password">
            <input
              className="input" id="login-password" name="password" type={passwordVisible ? 'text' : 'password'}
              autoComplete="current-password" value={password} spellCheck={false} autoCapitalize="none" autoCorrect="off"
              aria-invalid={invalidCredentials} aria-describedby={credentialsErrorId}
              onChange={(event) => { setPassword(event.target.value); setError(undefined); }}
              maxLength={256} required disabled={submitting}
            />
            <button
              className="login-password-toggle" type="button" aria-controls="login-password"
              aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setPasswordVisible((visible) => !visible)} disabled={submitting}
            >
              {passwordVisible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
            </button>
          </div>
        </div>
        {error && <div className="notice notice-error" id="login-error" role="alert">
          <p>{error.message}</p>
          {error.attempts && <p className="data mt-1">Quedan {error.attempts.remaining} de {error.attempts.limit} intentos.</p>}
        </div>}
        {retry && <div className="notice login-retry">
          <p role="status">Demasiados intentos. El acceso está temporalmente limitado.</p>
          <p className="data mt-1">Puedes volver a intentar en {retry.seconds} s.</p>
        </div>}
        <button className="button button-primary" type="submit" disabled={submitting || retry !== undefined}>
          <LogIn aria-hidden="true" size={17} /> {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  </>;
}
