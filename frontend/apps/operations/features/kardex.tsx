'use client';

import { History } from 'lucide-react';
import { useState } from 'react';
import { currency, localDate, units, type Movement, type Product } from '@hce/api';
import { Dialog, LoadState, SearchField, useRecords, useSearchTerm } from '@hce/records';

function MovementHistory({ product, close }: { product: Product; close: () => void }) {
  const movements = useRecords<Movement[]>(`/kardex/${product.id}/movements`);
  return <Dialog title="Movimientos del producto" subtitle={`${product.name} (lote ${product.lot})`} onClose={close} wide>
    <LoadState records={movements.records} retry={movements.retry}>
      {(rows) => rows.length ? <div className="scroll-table"><table className="table-hce">
        <thead><tr>
          <th scope="col">Fecha de registro</th><th scope="col">Tipo de movimiento</th><th className="numeric" scope="col">Cantidad</th>
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td className="data">{localDate.format(new Date(row.registeredAt))}</td>
          <td><span className={row.type === 'Entrada' ? 'badge badge-entry' : 'badge'}>{row.type}</span></td>
          <td className="numeric">{row.type === 'Entrada' ? '+' : '−'}{units.format(row.quantity)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="tray rounded-[var(--radius-control)] p-4">Las entradas y salidas aparecerán aquí al registrarlas.</p>}
    </LoadState>
  </Dialog>;
}

export function Kardex() {
  const ledger = useRecords<Product[]>('/kardex');
  const [search, setSearch] = useSearchTerm();
  const [selected, setSelected] = useState<Product>();
  return <>
    <div className="page-head">
      <div><h1>Kardex</h1><p>Consulta las existencias por lote y su historial de movimientos.</p></div>
    </div>
    <section className="panel" aria-label="Existencias">
      <div className="panel-toolbar">
        <h2>Existencias por producto</h2>
        <SearchField value={search} onChange={setSearch} label="Buscar producto o lote" />
      </div>
      <LoadState records={ledger.records} retry={ledger.retry}>
        {(products) => {
          const term = search.trim().toLocaleLowerCase('es-PE');
          const visible = products.filter((product) => `${product.id} ${product.name} ${product.lot}`.toLocaleLowerCase('es-PE').includes(term));
          return visible.length ? <div className="scroll-table" tabIndex={0} role="region" aria-label="Tabla de existencias"><table className="table-hce catalog-table">
            <thead><tr>
              <th scope="col">ID</th><th scope="col">Producto</th><th scope="col">Lote</th><th className="numeric" scope="col">Stock actual</th>
              <th className="numeric" scope="col">Costo</th><th className="numeric" scope="col">Precio de venta</th>
              <th scope="col"><span className="sr-only">Acciones</span></th>
            </tr></thead>
            <tbody>{visible.map((product) => <tr key={product.id}>
              <td className="data">{product.id}</td><td className="stable-name">{product.name}</td><td>{product.lot}</td>
              <td className="numeric"><span className={product.stock > 0 ? 'badge badge-entry' : 'badge badge-empty'}>{units.format(product.stock)}</span></td>
              <td className="numeric">{currency.format(product.cost)}</td><td className="numeric">{currency.format(product.salePrice)}</td>
              <td className="numeric"><button className="button row-action" type="button" onClick={() => setSelected(product)} aria-label={`Ver movimientos de ${product.name}, lote ${product.lot}`}>
                <History aria-hidden="true" size={16} /> <span className="row-action-label">Movimientos</span>
              </button></td>
            </tr>)}</tbody>
          </table></div> : <div className="border-t rule p-5">
            <p className="muted">{term ? 'No hay productos que coincidan con la búsqueda.' : 'El Kardex está vacío. Registra una compra para ingresar el primer lote.'}</p>
            {!term && <a href="/operaciones/compras" className="button mt-3">Ir a compras</a>}
          </div>;
        }}
      </LoadState>
    </section>
    {selected && <MovementHistory product={selected} close={() => setSelected(undefined)} />}
  </>;
}
