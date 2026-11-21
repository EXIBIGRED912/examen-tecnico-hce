import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Inventario HCE', template: '%s | Inventario HCE' },
  description: 'Registro de insumos médicos y movimientos de inventario.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-PE" className="overflow-x-clip"><body className="overflow-x-clip">{children}</body></html>;
}
