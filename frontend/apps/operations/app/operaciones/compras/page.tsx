import type { Metadata } from 'next';
import { Workspace } from '@hce/workspace';
import { DocumentForm } from '../../../features/document-form';

export const metadata: Metadata = { title: 'Compras' };

export default function PurchasesPage() {
  return <Workspace current="/operaciones/compras"><DocumentForm kind="purchase" /></Workspace>;
}
