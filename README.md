# HCE · Inventario de insumos médicos

Aplicación de demostración para registrar compras y ventas por producto y lote, calcular la disponibilidad y consultar el historial en el Kardex. Los datos son sintéticos.

## Arranque con Docker

Requiere Docker Compose v2 y contenedores Linux x86-64 para SQL Server 2022. Reserva los puertos `3000` y `3001` del equipo.

```powershell
Copy-Item .env.example .env
docker compose up -d --build --wait
docker compose ps --all
```

En Bash, usa `cp .env.example .env` para el primer comando. Docker inicia SQL Server, espera una conexión válida y ejecuta `database/init.sql` con `db-init`. El inicializador termina con código `0`; luego quedan en ejecución la interfaz, el gateway y los microservicios.

| Recurso | Dirección |
| --- | --- |
| Portal | [http://localhost:3000](http://localhost:3000) |
| Swagger UI | [http://localhost:3001/docs](http://localhost:3001/docs) |
| OpenAPI JSON | [http://localhost:3001/docs-json](http://localhost:3001/docs-json) |
| Salud del gateway y sus dependencias | [http://localhost:3001/api/health](http://localhost:3001/api/health) |

El archivo `.env.example` contiene las credenciales locales de demostración `operador` / `HceDemo!2026`. Abre el portal con el nombre `localhost` para coincidir con el origen definido en CORS. Los puertos públicos del stack están enlazados a loopback y SQL Server conserva los datos en el volumen `sql-data`.

```console
docker compose logs db-init
docker compose logs -f gateway catalog inventory
docker compose down
```

`docker compose down` detiene el entorno y conserva el volumen. Para iniciarlo de nuevo, ejecuta `docker compose up -d --wait`.

## Flujo de demostración

1. Inicia sesión y entra a **Compras**. Agrega al menos dos productos. Usa el modal de producto para crear un lote y añadirlo al documento.
2. Guarda la compra. El registro crea una entrada por línea y actualiza el costo y el precio de venta en el catálogo.
3. En **Ventas**, selecciona los productos que recibiste. Revisa el precio de venta, el stock disponible y los importes al cambiar la cantidad. Intenta exceder el saldo y luego guarda una venta válida.
4. En **Kardex**, verifica que el saldo sea la suma de entradas menos las salidas. Abre el historial de la fila para ver fecha, tipo y cantidad.

## Importes y stock

| Campo | Compra | Venta |
| --- | --- | --- |
| Precio unitario | Costo de la línea | Precio de venta vigente en SQL Server |
| Subtotal de línea | Cantidad × costo | Cantidad × precio de venta |
| IGV de línea | Subtotal × 0.18 | Subtotal × 1.18, fórmula literal del PDF |
| Total de línea | Subtotal + IGV | Subtotal + IGV |

Se redondean los importes monetarios a dos decimales. El precio de venta después de una compra es `costo × 1.35`. Por ejemplo, con costo S/ 10.00, dos unidades vendidas a S/ 13.50 generan subtotal S/ 27.00, IGV S/ 31.86 y total S/ 58.86 según la fórmula solicitada. Para el IGV de compra se asumió 18% del subtotal.

Los procedimientos validan existencias dentro de la transacción que escribe el documento y sus movimientos. El cliente muestra una estimación y el servidor confirma los importes y el saldo al registrar la operación.

## Arquitectura y código

| Ruta | Responsabilidad |
| --- | --- |
| [`backend/`](backend/) | Gateway REST NestJS y microservicios TCP de catálogo e inventario |
| [`frontend/`](frontend/) | Shell y zona de operaciones Next.js desplegadas por separado, Tailwind con diseño Hallmark Dose e interceptores Axios |
| [`database/`](database/) | Esquema SQL Server, consultas, procedimientos transaccionales y auditoría |
| [`docs/evaluacion-teorica-hce.pdf`](docs/evaluacion-teorica-hce.pdf) | Evaluación teórica y diagrama con Docker, monitoreo e integraciones |

El shell Next.js atiende la navegación y la sesión. Las rutas `/operaciones/*` se sirven desde la zona de operaciones mediante rewrites y su bundle se despliega de forma independiente. El navegador consume el gateway en `:3001`. El gateway centraliza autenticación y enrutamiento, y las operaciones internas viajan por TCP entre contenedores. Catálogo e inventario encapsulan la persistencia detrás de puertos y adaptadores. La base común mantiene la atomicidad de documento, movimiento y costo.

El JWT dura 30 minutos y viaja en una cookie HttpOnly. Axios incluye las credenciales en las solicitudes y gestiona respuestas de sesión vencida. El gateway comprueba el origen de las operaciones de escritura y aplica CORS y Helmet. El login admite 10 solicitudes por minuto por IP. El portal muestra los intentos restantes tras un rechazo de credenciales y usa `Retry-After` para indicar la espera tras un HTTP 429. Los datos y credenciales de ejemplo corresponden a ejecución local.

## Pruebas

Usa la [colección Postman](backend/postman/HCE.postman_collection.json) con el gateway levantado. Ejecuta el login primero y conserva las cookies en Postman. Swagger enumera los contratos y códigos de respuesta.

Con Node.js 22 o posterior puedes verificar el flujo completo contra el entorno Docker. La prueba crea dos lotes sintéticos con nombre de prueba y comprueba JWT, compra, idempotencia, venta, stock, concurrencia y Kardex.

```console
node --env-file=.env scripts/smoke-test.mjs
```

La prueba SQL verifica los procedimientos y triggers de auditoría dentro de una transacción y revierte sus datos al terminar. Ejecuta el comando desde la raíz con el contenedor `db` saludable.

```console
docker compose run --rm --no-deps db-init -S db -U sa -C -b -d HceInventory -i verify.sql
```
