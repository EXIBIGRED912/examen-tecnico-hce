'use client';

import { Check, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { api, ApiError, currency, errorMessage, units, type DocumentHeader, type Product } from '@hce/api';
import { ProductDialog } from '@hce/product-dialog';
import { LoadState, SelectIcon, useRecords } from '@hce/records';
import { DocumentHistory } from './document-history';

type Kind = 'purchase' | 'sale';
type Line = { id: number; productId: string; quantity: string; price: string };

const MAX_LINES = 100;
const MAX_QUANTITY = 1_000_000;
const MAX_PRICE = 9_999_999_999.99;
const MAX_DOCUMENT_CENTS = 999_999_999_999_999n;

const labels = {
  purchase: {
    title: 'Compras',
    description: 'Registra la entrada de medicamentos e insumos al inventario.',
    action: 'Registrar compra',
    history: 'Compras registradas',
    path: '/purchases',
    rate: 18n,
  },
  sale: {
    title: 'Ventas',
    description: 'Registra la salida de insumos con el stock disponible por lote.',
    action: 'Registrar venta',
    history: 'Ventas registradas',
    path: '/sales',
    rate: 118n,
  },
} as const;

function emptyLine(id: number): Line {
  return { id, productId: '', quantity: '1', price: '' };
}

const formatCents = (cents: bigint) => currency.format(Number(cents) / 100);

export function DocumentForm({ kind }: { kind: Kind }) {
  const copy = labels[kind];
  const isSale = kind === 'sale';
  const catalog = useRecords<Product[]>('/products');
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [newProduct, setNewProduct] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<DocumentHeader>();
  const [historyRevision, setHistoryRevision] = useState(0);
  const nextLineId = useRef(2);
  const pendingRequests = useRef(new Map<string, string>());

  const products = catalog.records.state === 'ready' ? catalog.records.data : [];
  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const usedProducts = new Set(lines.map((line) => line.productId).filter(Boolean));
  const amounts = new Map(lines.map((line) => {
    const product = productsById.get(line.productId);
    const quantity = Number(line.quantity);
    const price = isSale ? product?.salePrice : Number(line.price);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY || price === undefined || !Number.isFinite(price) || price < 0 || (!isSale && (!line.price || price > MAX_PRICE))) return [line.id, null] as const;
    const subtotal = BigInt(quantity) * BigInt(Math.round(price * 100));
    const igv = (subtotal * copy.rate + 50n) / 100n;
    return [line.id, { subtotal, igv }] as const;
  }));
  const totals = [...amounts.values()].reduce<{ subtotal: bigint; igv: bigint }>((sum, row) => {
    return row ? { subtotal: sum.subtotal + row.subtotal, igv: sum.igv + row.igv } : sum;
  }, { subtotal: 0n, igv: 0n });

  function changeLine(lineId: number, change: Partial<Omit<Line, 'id'>>) {
    setLines((previous) => previous.map((line) => line.id === lineId ? { ...line, ...change } : line));
    setError('');
    setSaved(undefined);
  }

  function selectProduct(lineId: number, productId: string) {
    const product = productsById.get(productId);
    changeLine(lineId, { productId, price: product && !isSale ? product.cost.toFixed(2) : '' });
  }

  function attachProduct(product: Product) {
    catalog.replace([...products, product].sort((a, b) => a.name.localeCompare(b.name, 'es-PE')));
    const target = lines.find((line) => !line.productId);
    const initial = { productId: String(product.id), price: product.cost.toFixed(2) };
    if (target) changeLine(target.id, initial);
    else if (lines.length < MAX_LINES) {
      const id = nextLineId.current++;
      setLines((previous) => [...previous, { ...emptyLine(id), ...initial }]);
    }
    setNewProduct(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvalid(true);
    setSaved(undefined);
    setError('');
    if (lines.some((line) => !productsById.has(line.productId))) {
      setError('Selecciona un producto en cada fila o elimina la fila vacía.');
      return;
    }
    if (usedProducts.size !== lines.length) {
      setError('Agrega cada producto una sola vez y ajusta su cantidad.');
      return;
    }
    if (lines.some((line) => !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1 || Number(line.quantity) > MAX_QUANTITY)) {
      setError('Ingresa una cantidad entera entre 1 y 1 000 000 por producto.');
      return;
    }
    if (isSale && lines.some((line) => Number(line.quantity) > (productsById.get(line.productId)?.stock ?? 0))) {
      setError('La cantidad no debe ser mayor al stock disponible.');
      return;
    }
    if (!isSale && lines.some((line) => !line.price || !/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(line.price) || Number(line.price) > MAX_PRICE)) {
      setError('Ingresa un costo unitario válido con hasta dos decimales por producto.');
      return;
    }
    if (totals.subtotal + totals.igv > MAX_DOCUMENT_CENTS) {
      setError('El importe total excede el máximo admitido.');
      return;
    }

    const items = lines.map((line) => ({
      productId: Number(line.productId), quantity: Number(line.quantity),
      ...(isSale ? {} : { price: Number(line.price) }),
    }));
    const payload = JSON.stringify(items);
    const key = pendingRequests.current.get(payload) ?? crypto.randomUUID();
    pendingRequests.current.set(payload, key);
    setSaving(true);
    try {
      const { data } = await api.post<DocumentHeader>(copy.path, { items }, { headers: { 'Idempotency-Key': key } });
      pendingRequests.current.clear();
      setLines([emptyLine(nextLineId.current++)]);
      setSaved(data);
      setInvalid(false);
      setHistoryRevision((n) => n + 1);
      catalog.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
      if (isSale && reason instanceof ApiError && reason.status === 409) catalog.refresh();
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="page-head">
      <div><h1>{copy.title}</h1><p>{copy.description}</p></div>
    </div>
    {saved && <div className="notice notice-success mb-4 flex items-center gap-2" role="status">
      <Check aria-hidden="true" size={18} />
      {isSale ? 'Venta registrada' : 'Compra registrada'} n.º {saved.id}. Total {currency.format(saved.total)}.
    </div>}
    <LoadState records={catalog.records} retry={catalog.retry}>
      {() => <form onSubmit={submit} noValidate className="document-layout" aria-label={copy.action}>
        <section className="panel" aria-label="Productos del documento">
          <div className="panel-toolbar">
            <div><h2>{isSale ? 'Nueva venta' : 'Nueva compra'}</h2><p className="muted mt-1 text-sm">Selecciona un producto y su cantidad por fila.</p></div>
            {!isSale && <button className="button" type="button" onClick={() => setNewProduct(true)} disabled={saving}>
              <Plus aria-hidden="true" size={16} /> Registrar producto
            </button>}
          </div>
          {products.length === 0 ? <p className="form-line muted">
            {isSale ? 'El catálogo está vacío. Registra una compra para ingresar stock.' : 'El catálogo está vacío. Registra un producto para añadirlo a la compra.'}
          </p> : lines.map((line, index) => {
            const product = productsById.get(line.productId);
            const exceedsStock = isSale && product && Number(line.quantity) > product.stock;
            const invalidQuantity = !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1 || Number(line.quantity) > MAX_QUANTITY;
            const options = products.filter((option) => String(option.id) === line.productId || !usedProducts.has(String(option.id)));
            const amount = amounts.get(line.id);
            return <fieldset className="form-line min-w-0" key={line.id} disabled={saving}>
              <legend className="sr-only">Producto {index + 1}</legend>
              <div className="line-grid">
                <label className="field product-field">
                  <span className="label">Producto</span>
                  <span className="select-wrap">
                    <select className="input" name={`product-${line.id}`} value={line.productId} onChange={(event) => selectProduct(line.id, event.target.value)} required
                      aria-invalid={invalid && !product}>
                      <option value="">Seleccionar producto</option>
                      {options.map((option) => <option key={option.id} value={option.id}>{option.name} (lote {option.lot})</option>)}
                    </select>
                    <SelectIcon />
                  </span>
                </label>
                <label className="field">
                  <span className="label">Cantidad</span>
                  <input className="input data" name={`quantity-${line.id}`} type="number" inputMode="numeric" min="1" max={MAX_QUANTITY} step="1" required
                    value={line.quantity}
                    onChange={(event) => changeLine(line.id, { quantity: event.target.value })}
                    aria-invalid={Boolean(exceedsStock || (invalid && invalidQuantity))}
                    aria-describedby={exceedsStock ? `stock-${line.id}` : undefined} />
                </label>
                {isSale ? <div className="field">
                  <span className="label">Precio de venta</span>
                  <span className="tray data flex min-h-11 items-center rounded-[var(--radius-control)] px-3">{product ? currency.format(product.salePrice) : '—'}</span>
                </div> : <label className="field">
                  <span className="label">Costo unitario (S/)</span>
                  <input className="input data" name={`price-${line.id}`} type="number" inputMode="decimal" min="0" max={MAX_PRICE} step="0.01" required
                    value={line.price} onChange={(event) => changeLine(line.id, { price: event.target.value })} />
                </label>}
                <button className="button button-icon" type="button" aria-label={`Quitar producto ${index + 1}`}
                  disabled={lines.length === 1} onClick={() => { setLines((previous) => previous.filter((item) => item.id !== line.id)); setError(''); }}>
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
              {isSale && product && <p className={`mt-2 text-sm ${exceedsStock ? 'notice notice-error' : 'muted'}`} id={`stock-${line.id}`}>
                Stock disponible: <strong className="data">{units.format(product.stock)}</strong>
                {exceedsStock && '. La cantidad supera el stock disponible.'}
              </p>}
              {amount && <dl className="data muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <div className="flex gap-1.5"><dt>Subtotal</dt><dd>{formatCents(amount.subtotal)}</dd></div>
                <div className="flex gap-1.5"><dt>IGV</dt><dd>{formatCents(amount.igv)}</dd></div>
                <div className="flex gap-1.5"><dt>Total</dt><dd>{formatCents(amount.subtotal + amount.igv)}</dd></div>
              </dl>}
            </fieldset>;
          })}
          {products.length > 0 && <div className="form-line">
            <button className="button" type="button" disabled={saving || lines.length >= MAX_LINES || lines.length >= products.length}
              onClick={() => { const id = nextLineId.current++; setLines((previous) => [...previous, emptyLine(id)]); setError(''); }}>
              <Plus aria-hidden="true" size={17} /> Agregar producto
            </button>
          </div>}
        </section>
        <aside className="panel tray p-5" aria-label="Resumen del documento">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList aria-hidden="true" size={19} /><h2>Resumen</h2>
          </div>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2"><dt>Subtotal</dt><dd className="data">{formatCents(totals.subtotal)}</dd></div>
            <div className="flex justify-between gap-2"><dt>IGV <span className="muted">({isSale ? '×1.18' : '18%'})</span></dt><dd className="data">{formatCents(totals.igv)}</dd></div>
            <div className="mt-1 flex items-baseline justify-between gap-2 border-t rule pt-3"><dt className="font-semibold">Total</dt><dd className="amount">{formatCents(totals.subtotal + totals.igv)}</dd></div>
          </dl>
          {error && <p className="notice notice-error mt-4" role="alert">{error}</p>}
          <button className="button button-primary mt-5 w-full" type="submit" disabled={saving || products.length === 0}>
            {saving ? 'Registrando…' : copy.action}
          </button>
        </aside>
      </form>}
    </LoadState>
    <DocumentHistory name={copy.history} path={copy.path} refreshKey={historyRevision} />
    {newProduct && <ProductDialog onClose={() => setNewProduct(false)} onSaved={attachProduct} />}
  </>;
}
