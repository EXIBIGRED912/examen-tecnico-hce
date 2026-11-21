import type { Metadata } from 'next';
import { Workspace } from '@hce/workspace';
import { DocumentForm } from '../../../features/document-form';

export const metadata: Metadata = { title: 'Ventas' };

export default function SalesPage() {
  return <Workspace current="/operaciones/ventas"><DocumentForm kind="sale" /></Workspace>;
}
