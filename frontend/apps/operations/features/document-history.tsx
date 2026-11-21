'use client';

import { List } from 'lucide-react';
import { useState } from 'react';
import { currency, localDate, units, type DocumentHeader, type InventoryDocument } from '@hce/api';
import { Dialog, LoadState, useRecords } from '@hce/records';

function DocumentDetail({ path, id, close }: { path: string; id: number; close: () => void }) {
  const details = useRecords<InventoryDocument>(`${path}/${id}`);
  return <Dialog title={`Documento n.º ${id}`} onClose={close} wide>
    <LoadState records={details.records} retry={details.retry}>
      {(doc) => <>
        <p className="muted mb-3 text-sm">{localDate.format(new Date(doc.registeredAt))}</p>
        <div className="scroll-table">
          <table className="table-hce">
            <thead><tr>
              <th scope="col">ID producto</th><th scope="col" className="numeric">Cantidad</th><th scope="col" className="numeric">Precio</th>
              <th scope="col" className="numeric">Subtotal</th><th scope="col" className="numeric">IGV</th><th scope="col" className="numeric">Total</th>
            </tr></thead>
            <tbody>{doc.items.map((item) => <tr key={item.productId}>
              <td className="data">{item.productId}</td><td className="numeric">{units.format(item.quantity)}</td>
              <td className="numeric">{currency.format(item.price)}</td><td className="numeric">{currency.format(item.subtotal)}</td>
              <td className="numeric">{currency.format(item.igv)}</td><td className="numeric">{currency.format(item.total)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </LoadState>
  </Dialog>;
}

export function DocumentHistory({ name, path }: { name: string; path: string }) {
  const history = useRecords<DocumentHeader[]>(path);
  const [selected, setSelected] = useState<number>();
  return <section className="panel mt-6" aria-label={name}>
    <div className="panel-toolbar"><h2>{name}</h2></div>
    <LoadState records={history.records} retry={history.retry}>
      {(documents) => documents.length > 0 ? <div className="scroll-table">
        <table className="table-hce">
          <thead><tr>
            <th scope="col">N.º</th><th scope="col">Fecha de registro</th>
            <th scope="col" className="numeric">Subtotal</th><th scope="col" className="numeric">IGV</th><th scope="col" className="numeric">Total</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr></thead>
          <tbody>{documents.map((doc) => <tr key={doc.id}>
            <td className="data stable-name">{doc.id}</td><td className="data">{localDate.format(new Date(doc.registeredAt))}</td>
            <td className="numeric">{currency.format(doc.subtotal)}</td><td className="numeric">{currency.format(doc.igv)}</td>
            <td className="numeric stable-name">{currency.format(doc.total)}</td>
            <td className="numeric"><button className="button" type="button" onClick={() => setSelected(doc.id)} aria-label={`Detalle del documento ${doc.id}`}>
              <List aria-hidden="true" size={16} /> Detalle
            </button></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="border-t rule p-5 muted">Los documentos aparecerán aquí al registrarlos.</p>}
    </LoadState>
    {selected !== undefined && <DocumentDetail path={path} id={selected} close={() => setSelected(undefined)} />}
  </section>;
}
