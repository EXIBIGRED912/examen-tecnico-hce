import axios from 'axios';

export interface Session {
  username: string;
  expiresIn: number;
}

export interface Product {
  id: number;
  name: string;
  lot: string;
  registeredAt: string;
  cost: number;
  salePrice: number;
  stock: number;
}

export type ProductInput = Pick<Product, 'name' | 'lot' | 'cost'>;

export interface Totals {
  subtotal: number;
  igv: number;
  total: number;
}

export interface DocumentHeader extends Totals {
  id: number;
  registeredAt: string;
}

export interface DocumentLine extends Totals {
  productId: number;
  quantity: number;
  price: number;
}

export interface InventoryDocument extends DocumentHeader {
  items: DocumentLine[];
}

export interface Movement {
  id: number;
  registeredAt: string;
  type: 'Entrada' | 'Salida';
  quantity: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  timeout: 12_000,
  allowAbsoluteUrls: false,
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  config.headers.set('Accept', 'application/json');
  if (config.method && ['post', 'put', 'patch'].includes(config.method)) {
    config.headers.set('Content-Type', 'application/json');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (reason: unknown) => {
    if (axios.isCancel(reason) || !axios.isAxiosError(reason)) return Promise.reject(reason);
    const status = reason.response?.status;
    if (status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      const next = window.location.pathname;
      window.location.replace(`/login?next=${encodeURIComponent(next)}&session=required`);
    }
    const details: unknown = reason.response?.data?.message;
    const message = typeof details === 'string' ? details
      : Array.isArray(details) ? details.join('. ')
      : status === 429 ? 'Hay demasiadas solicitudes. Espera un momento y vuelve a intentar.'
      : status ? 'La operación no pudo completarse.'
      : 'No se pudo establecer comunicación con el servidor. Vuelve a intentar.';
    return Promise.reject(new ApiError(message, status));
  },
);

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

export const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
export const units = new Intl.NumberFormat('es-PE');
export const localDate = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Lima',
});
