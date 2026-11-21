import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const apiUrl = process.env.HCE_API_URL ?? 'http://localhost:3001/api';
const origin = process.env.HCE_FRONTEND_ORIGIN ?? 'http://localhost:3000';
const username = process.env.DEMO_USERNAME ?? 'operador';
const password = process.env.DEMO_PASSWORD ?? 'HceDemo!2026';
let cookie;

async function request(path, { method = 'GET', body, key, status = 200 } = {}) {
  const headers = { Origin: origin };
  if (cookie) headers.Cookie = cookie;
  if (key) headers['Idempotency-Key'] = key;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const content = await response.text();
  const acceptedStatuses = Array.isArray(status) ? status : [status];
  assert.ok(
    acceptedStatuses.includes(response.status),
    `${method} ${path} devolvió ${response.status}, esperado ${acceptedStatuses.join(' o ')}. ${content}`,
  );
  return { response, data: content ? JSON.parse(content) : undefined };
}

const { data: health } = await request('/health');
assert.equal(health.status, 'ok');
await request('/products', { status: 401 });

const { response: login, data: session } = await request('/auth/login', {
  method: 'POST',
  body: { username, password },
});
assert.equal(session.expiresIn, 1800);
assert.equal(login.headers.get('x-content-type-options'), 'nosniff');
assert.equal(login.headers.get('access-control-allow-origin'), origin);
const header = login.headers.getSetCookie().find((entry) => entry.startsWith('hce_access='));
assert.ok(header, 'El login debe emitir hce_access');
assert.match(header, /;\s*HttpOnly/i);
assert.match(header, /;\s*Max-Age=1800(?:;|$)/i);
cookie = header.split(';')[0];
const claims = JSON.parse(Buffer.from(cookie.split('.')[1], 'base64url').toString('utf8'));
assert.equal(claims.exp - claims.iat, 1800);
console.log('OK · salud, protección de rutas, CORS y JWT de 30 minutos');

const lot = `PRUEBA-${randomUUID().slice(0, 8)}`;
await request('/products/1e2', { status: 400 });
await request('/products', {
  method: 'POST',
  status: 400,
  body: { name: 'Costo inválido de prueba', lot, cost: 1e-7 },
});
const { data: gloves } = await request('/products', {
  method: 'POST',
  status: 201,
  body: { name: 'Guantes de prueba', lot: `${lot}-A`, cost: 1 },
});
const { data: gauze } = await request('/products', {
  method: 'POST',
  status: 201,
  body: { name: 'Gasa de prueba', lot: `${lot}-B`, cost: 1 },
});
const purchaseItems = [
  { productId: gloves.id, quantity: 20, price: 10 },
  { productId: gauze.id, quantity: 5, price: 4 },
];
const purchaseKey = randomUUID();
const purchaseRequest = { method: 'POST', body: { items: purchaseItems }, key: purchaseKey, status: 201 };
const { data: purchase } = await request('/purchases', purchaseRequest);
const { data: repeatedPurchase } = await request('/purchases', purchaseRequest);
assert.equal(repeatedPurchase.id, purchase.id);
assert.deepEqual([purchase.subtotal, purchase.igv, purchase.total], [220, 39.6, 259.6]);
console.log('OK · compra de dos productos con redondeo y reintento idempotente');

await request('/sales', {
  method: 'POST',
  body: { items: [{ productId: gloves.id, quantity: 21 }] },
  status: 409,
});
const { data: sale } = await request('/sales', {
  method: 'POST',
  status: 201,
  body: { items: [{ productId: gloves.id, quantity: 2 }, { productId: gauze.id, quantity: 1 }] },
});
assert.deepEqual([sale.subtotal, sale.igv, sale.total], [32.4, 38.23, 70.63]);
const { data: saleDetail } = await request(`/sales/${sale.id}`);
assert.equal(saleDetail.items.find((item) => item.productId === gloves.id)?.price, 13.5);
const { data: kardex } = await request('/kardex');
assert.equal(kardex.find((item) => item.id === gloves.id)?.stock, 18);
assert.equal(kardex.find((item) => item.id === gauze.id)?.stock, 4);
const { data: movements } = await request(`/kardex/${gloves.id}/movements`);
assert.equal(movements.length, 2);
assert.ok(movements.some(({ type, quantity }) => type === 'Entrada' && quantity === 20));
assert.ok(movements.some(({ type, quantity }) => type === 'Salida' && quantity === 2));
console.log('OK · venta, rechazo por saldo insuficiente, precio y Kardex');

const concurrentSale = {
  method: 'POST',
  body: { items: [{ productId: gauze.id, quantity: 3 }] },
  status: [201, 409],
};
const competing = await Promise.all([request('/sales', concurrentSale), request('/sales', concurrentSale)]);
assert.deepEqual(competing.map(({ response }) => response.status).sort(), [201, 409]);
const { data: finalKardex } = await request('/kardex');
assert.equal(finalKardex.find((item) => item.id === gauze.id)?.stock, 1);
console.log('OK · solo una venta concurrente consume el saldo disponible');

await request('/auth/logout', { method: 'POST', body: {}, status: 204 });
cookie = undefined;
await request('/auth/session', { status: 401 });
console.log('Prueba integrada completada. Lotes generados:', lot);
