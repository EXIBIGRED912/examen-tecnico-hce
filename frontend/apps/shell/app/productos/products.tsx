'use client';

import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { currency, units, type Product } from '@hce/api';
import { ProductDialog } from '@hce/product-dialog';
import { LoadState, RecordTable, SearchField, useRecords, useSearchTerm } from '@hce/records';

export function Products() {
  const catalog = useRecords<Product[]>('/products');
  const [search, setSearch] = useSearchTerm();
  const [editing, setEditing] = useState<Product | 'new'>();
  const [saved, setSaved] = useState('');

  return <>
    <div className="page-head">
      <div><h1>Productos</h1><p>Catálogo de medicamentos e insumos por lote.</p></div>
      <button className="button button-primary" type="button" onClick={() => { setSaved(''); setEditing('new'); }}>
        <Plus aria-hidden="true" size={17} /> Registrar producto
      </button>
    </div>
    {saved && <p className="notice notice-success mb-4" role="status">{saved}</p>}
    <section className="panel" aria-label="Catálogo de productos">
      <LoadState records={catalog.records} retry={catalog.retry}>
        {(products) => {
          const term = search.trim().toLocaleLowerCase('es-PE');
          const visible = products.filter((product) => `${product.id} ${product.name} ${product.lot}`.toLocaleLowerCase('es-PE').includes(term));
          return <RecordTable rows={visible} label="Tabla del catálogo" title="Catálogo" searchTerm={term}
            search={<SearchField value={search} onChange={setSearch} label="Buscar producto o lote" />}
            empty={<p className="border-t rule p-5 muted">{term ? 'No hay productos que coincidan con la búsqueda.' : 'El catálogo está vacío. Registra un producto para empezar.'}</p>}>
            {(visibleRows) => <table className="table-hce catalog-table">
              <thead><tr>
                <th scope="col">ID</th><th scope="col">Producto</th><th scope="col">Lote</th>
                <th scope="col" className="numeric">Stock</th><th scope="col" className="numeric">Costo</th>
                <th scope="col" className="numeric">Precio de venta</th><th scope="col"><span className="sr-only">Acciones</span></th>
              </tr></thead>
              <tbody>{visibleRows.map((product) => <tr key={product.id}>
                <td className="data">{product.id}</td><td className="stable-name">{product.name}</td><td>{product.lot}</td>
                <td className="numeric">{units.format(product.stock)}</td><td className="numeric">{currency.format(product.cost)}</td>
                <td className="numeric">{currency.format(product.salePrice)}</td>
                <td className="numeric"><button className="button row-action" type="button" onClick={() => { setSaved(''); setEditing(product); }} aria-label={`Editar ${product.name}`}>
                  <Pencil aria-hidden="true" size={14} /> <span className="row-action-label">Editar</span>
                </button></td>
              </tr>)}</tbody>
            </table>}
          </RecordTable>;
        }}
      </LoadState>
    </section>
    {editing && <ProductDialog
      product={editing === 'new' ? undefined : editing}
      onClose={() => setEditing(undefined)}
      onSaved={(product) => {
        setEditing(undefined);
        setSaved(`Producto guardado: ${product.name}.`);
        catalog.refresh();
      }}
    />}
  </>;
}
