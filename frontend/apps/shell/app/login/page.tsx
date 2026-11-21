import type { Metadata } from 'next';
import { Login } from './login';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return <Login />;
}
