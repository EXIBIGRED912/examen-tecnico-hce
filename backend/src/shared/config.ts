export function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Falta la variable de entorno ${key}.`);
  return value;
}

export function envPort(key: string, fallback: number): number {
  const port = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Puerto inválido en ${key}.`);
  }
  return port;
}
