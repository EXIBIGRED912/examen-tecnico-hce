import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const operationsOrigin = process.env.OPERATIONS_ORIGIN ?? 'http://localhost:3002';

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  outputFileTracingRoot: root,
  poweredByHeader: false,
  turbopack: { root },
  async rewrites() {
    return [
      { source: '/operaciones/:path*', destination: `${operationsOrigin}/operaciones/:path*` },
      { source: '/operaciones-static/:path*', destination: `${operationsOrigin}/operaciones-static/:path*` },
    ];
  },
};

export default config;
