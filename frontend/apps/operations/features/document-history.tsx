'use client';

import { List } from 'lucide-react';
import { useState } from 'react';
import { currency, localDate, units, type DocumentHeader, type InventoryDocument } from '@hce/api';
import { Dialog, LoadState, RecordTable, useRecords } from '@hce/records';

function DocumentDetail({ path, id, close }: { path: string; id: number; close: () => void }) {
  const details = useRecords<InventoryDocument>(`${path}/${id}`);
  return <Dialog title={`Documento n.º ${id}`} onClose={close} wide>
    <LoadState records={details.records} retry={details.retry}>
      {(doc) => <>
        <p className="muted mb-3 text-sm">{localDate.format(new Date(doc.registeredAt))}</p>
        <RecordTable rows={doc.items} label="Productos del documento">
          {(items) => <table className="table-hce">
            <thead><tr>
              <th scope="col">ID producto</th><th scope="col" className="numeric">Cantidad</th><th scope="col" className="numeric">Precio</th>
              <th scope="col" className="numeric">Subtotal</th><th scope="col" className="numeric">IGV</th><th scope="col" className="numeric">Total</th>
            </tr></thead>
            <tbody>{items.map((item) => <tr key={item.productId}>
              <td className="data">{item.productId}</td><td className="numeric">{units.format(item.quantity)}</td>
              <td className="numeric">{currency.format(item.price)}</td><td className="numeric">{currency.format(item.subtotal)}</td>
              <td className="numeric">{currency.format(item.igv)}</td><td className="numeric">{currency.format(item.total)}</td>
            </tr>)}</tbody>
          </table>}
        </RecordTable>
      </>}
    </LoadState>
  </Dialog>;
}

export function DocumentHistory({ name, path, refreshKey }: { name: string; path: string; refreshKey: number }) {
  const history = useRecords<DocumentHeader[]>(path, refreshKey);
  const [selected, setSelected] = useState<number>();
  return <section className="panel mt-6" aria-label={name}>
    <LoadState records={history.records} retry={history.retry}>
      {(documents) => <RecordTable rows={documents} label={name} title={name}
        empty={<p className="border-t rule p-5 muted">Los documentos aparecerán aquí al registrarlos.</p>}>
        {(visibleDocuments) => <table className="table-hce">
          <thead><tr>
            <th scope="col">N.º</th><th scope="col">Fecha de registro</th>
            <th scope="col" className="numeric">Subtotal</th><th scope="col" className="numeric">IGV</th><th scope="col" className="numeric">Total</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr></thead>
          <tbody>{visibleDocuments.map((doc) => <tr key={doc.id}>
            <td className="data stable-name">{doc.id}</td><td className="data">{localDate.format(new Date(doc.registeredAt))}</td>
            <td className="numeric">{currency.format(doc.subtotal)}</td><td className="numeric">{currency.format(doc.igv)}</td>
            <td className="numeric stable-name">{currency.format(doc.total)}</td>
            <td className="numeric"><button className="button" type="button" onClick={() => setSelected(doc.id)} aria-label={`Detalle del documento ${doc.id}`}>
              <List aria-hidden="true" size={16} /> Detalle
            </button></td>
          </tr>)}</tbody>
        </table>}
      </RecordTable>}
    </LoadState>
    {selected !== undefined && <DocumentDetail path={path} id={selected} close={() => setSelected(undefined)} />}
  </section>;
}
