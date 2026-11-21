import type { Metadata } from 'next';
import { Workspace } from '@hce/workspace';
import { Products } from './products';

export const metadata: Metadata = { title: 'Productos' };

export default function ProductsPage() {
  return <Workspace current="/productos"><Products /></Workspace>;
}
