import type { Metadata } from 'next';
import { Workspace } from '@hce/workspace';
import { Kardex } from '../../../features/kardex';

export const metadata: Metadata = { title: 'Kardex' };

export default function KardexPage() {
  return <Workspace current="/operaciones/kardex"><Kardex /></Workspace>;
}
