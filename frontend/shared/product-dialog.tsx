'use client';

import { useState, type FormEvent } from 'react';
import { api, currency, errorMessage, type Product, type ProductInput } from './api';
import { Dialog } from './records';

export function ProductDialog({ product, onClose, onSaved }: {
  product?: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [lot, setLot] = useState(product?.lot ?? '');
  const [cost, setCost] = useState(product?.cost.toFixed(2) ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: ProductInput = { name: name.trim(), lot: lot.trim(), cost: Number(cost) };
    if (!input.name || !input.lot) {
      setError('Escribe un nombre y un número de lote válidos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = product
        ? await api.patch<Product>(`/products/${product.id}`, input)
        : await api.post<Product>('/products', input);
      onSaved(data);
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  }

  const previewPrice = Math.round(Math.round(Number(cost) * 100) * 135 / 100) / 100;
  return <Dialog title={product ? 'Editar producto' : 'Registrar producto'} busy={saving} onClose={onClose}>
    <form className="grid gap-4" onSubmit={submit}>
      <label className="field">
        <span className="label">Nombre del producto</span>
        <input className="input" name="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={saving} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span className="label">N.º de lote</span>
          <input className="input" name="lot" value={lot} onChange={(event) => setLot(event.target.value)} required maxLength={60} disabled={saving} />
        </label>
        <label className="field">
          <span className="label">Costo unitario (S/)</span>
          <input className="input data" name="cost" type="number" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} min={0} max={9999999999.99} step="0.01" required disabled={saving} />
        </label>
      </div>
      <p className="muted text-sm">Precio de venta estimado: <strong className="data">{cost && Number.isFinite(previewPrice) ? currency.format(previewPrice) : '—'}</strong></p>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button className="button" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button>
      </div>
    </form>
  </Dialog>;
}
