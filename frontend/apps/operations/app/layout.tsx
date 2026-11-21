import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Operaciones', template: '%s | Inventario HCE' },
  description: 'Compras, ventas y Kardex de insumos médicos.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-PE" className="overflow-x-clip"><body className="overflow-x-clip">{children}</body></html>;
}
