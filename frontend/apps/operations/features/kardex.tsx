'use client';

import { History } from 'lucide-react';
import { useState } from 'react';
import { currency, localDate, units, type Movement, type Product } from '@hce/api';
import { Dialog, LoadState, RecordTable, SearchField, useRecords, useSearchTerm } from '@hce/records';

function MovementHistory({ product, close }: { product: Product; close: () => void }) {
  const movements = useRecords<Movement[]>(`/kardex/${product.id}/movements`);
  return <Dialog title="Movimientos del producto" subtitle={`${product.name} (lote ${product.lot})`} onClose={close} wide>
    <LoadState records={movements.records} retry={movements.retry}>
      {(rows) => <RecordTable rows={rows} label="Movimientos del producto"
        empty={<p className="tray rounded-[var(--radius-control)] p-4">Las entradas y salidas aparecerán aquí al registrarlas.</p>}>
        {(visibleRows) => <table className="table-hce">
          <thead><tr>
            <th scope="col">Fecha de registro</th><th scope="col">Tipo de movimiento</th><th className="numeric" scope="col">Cantidad</th>
          </tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id}>
            <td className="data">{localDate.format(new Date(row.registeredAt))}</td>
            <td><span className={row.type === 'Entrada' ? 'badge badge-entry' : 'badge'}>{row.type}</span></td>
            <td className="numeric">{row.type === 'Entrada' ? '+' : '−'}{units.format(row.quantity)}</td>
          </tr>)}</tbody>
        </table>}
      </RecordTable>}
    </LoadState>
  </Dialog>;
}

function KardexResults({ products, search, setSearch, onSelect }: {
  products: Product[];
  search: string;
  setSearch: (value: string) => void;
  onSelect: (product: Product) => void;
}) {
  const term = search.trim().toLocaleLowerCase('es-PE');
  const matches = products.filter(({ id, name, lot }) => `${id} ${name} ${lot}`.toLocaleLowerCase('es-PE').includes(term));
  return <RecordTable rows={matches} label="Tabla de existencias" title="Existencias por producto" scrollClassName="kardex-scroll" searchTerm={term}
    search={<SearchField value={search} onChange={setSearch} label="Buscar producto o lote" />}
    empty={<div className="border-t rule p-5">
      <p className="muted" role="status">{term ? 'No hay productos que coincidan con la búsqueda.' : 'El Kardex está vacío. Registra una compra para ingresar el primer lote.'}</p>
      {!term && <a href="/operaciones/compras" className="button mt-3">Ir a compras</a>}
    </div>}>
    {(visibleRows) => <table className="table-hce catalog-table">
      <thead><tr>
        <th scope="col">ID</th><th scope="col">Producto</th><th scope="col">Lote</th><th className="numeric" scope="col">Stock actual</th>
        <th className="numeric" scope="col">Costo</th><th className="numeric" scope="col">Precio de venta</th>
        <th scope="col"><span className="sr-only">Acciones</span></th>
      </tr></thead>
      <tbody>{visibleRows.map((product) => <tr key={product.id}>
        <td className="data">{product.id}</td><td className="stable-name">{product.name}</td><td>{product.lot}</td>
        <td className="numeric"><span className={product.stock > 0 ? 'badge badge-entry' : 'badge badge-empty'}>{units.format(product.stock)}</span></td>
        <td className="numeric">{currency.format(product.cost)}</td><td className="numeric">{currency.format(product.salePrice)}</td>
        <td className="numeric"><button className="button row-action" type="button" onClick={() => onSelect(product)} aria-label={`Ver movimientos de ${product.name}, lote ${product.lot}`}>
          <History aria-hidden="true" size={16} /> <span className="row-action-label">Movimientos</span>
        </button></td>
      </tr>)}</tbody>
    </table>}
  </RecordTable>;
}

export function Kardex() {
  const ledger = useRecords<Product[]>('/kardex');
  const [search, setSearch] = useSearchTerm();
  const [selected, setSelected] = useState<Product>();
  return <>
    <div className="page-head">
      <div><h1>Kardex</h1><p>Consulta las existencias por lote y su historial de movimientos.</p></div>
    </div>
    <section className="panel" aria-label="Existencias por producto">
      <LoadState records={ledger.records} retry={ledger.retry}>
        {(products) => <KardexResults products={products} search={search} setSearch={setSearch} onSelect={setSelected} />}
      </LoadState>
    </section>
    {selected && <MovementHistory product={selected} close={() => setSelected(undefined)} />}
  </>;
}
