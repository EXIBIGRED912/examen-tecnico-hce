import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** @type {import('next').NextConfig} */
const config = {
  assetPrefix: '/operaciones-static',
  output: 'standalone',
  outputFileTracingRoot: root,
  poweredByHeader: false,
  turbopack: { root },
};

export default config;
