# Guion para el video del examen técnico HCE

Duración aproximada de cinco minutos. El recorrido muestra cómo se levanta el sistema, cómo se organiza el código y qué pasa con el stock cuando una compra y una venta se registran de principio a fin. Las indicaciones en cursiva son para la grabación. El resto está escrito para decirlo en voz alta.

## Antes de grabar

- Levanta el proyecto desde la raíz con `docker compose up -d --build --wait`. Si falta `.env`, copia `.env.example` antes de levantarlo. [Instrucciones del proyecto](../README.md)
- Deja abiertos el portal, Swagger, el diagrama del PDF, el repositorio y una terminal en la carpeta del proyecto. Prepara el inicio de sesión fuera de cámara. [Portal](http://localhost:3000) · [Swagger](http://localhost:3001/docs) · [Evaluación teórica](evaluacion-teorica-hce.pdf)
- Escoge dos lotes nuevos que puedas encontrar fácil, por ejemplo `VIDEO-01-A` para Guantes de examen y `VIDEO-01-B` para Gasa estéril. Si ensayas primero, cambia el número en la toma final para partir de cero.

## 0:00–0:30 · Presentación

*En pantalla. Muestra el portal con la sesión iniciada y deja visibles las opciones Productos, Compras, Ventas y Kardex.*

Hola. Para el examen HCE armé un inventario de insumos médicos por producto y lote. La pregunta que quise resolver es bastante concreta. Si recibo veinte unidades y después salen dos, ¿puedo mostrar de dónde vienen las dieciocho que quedan? Para verlo voy a usar el mismo lote durante toda la demo, desde la compra hasta el historial del Kardex.

## 0:30–1:35 · Arquitectura, código y sesión

*En pantalla. Ejecuta `docker compose ps --all`, muestra el diagrama y localiza `frontend/apps`, `backend/src` y `database` en el editor. Deja a mano `inventory.facade.ts` y `session.ts`.*

El entorno arranca con Docker Compose. SQL Server queda listo primero y un contenedor ejecuta los scripts de inicialización. En el navegador se ve un solo portal, aunque por debajo hay dos aplicaciones Next.js. El portal lleva la navegación y las rutas de compras, ventas y Kardex pasan a la segunda aplicación. Cada una tiene su propio despliegue.

En el backend, el gateway de NestJS recibe HTTP y conversa por TCP con Catálogo e Inventario. Catálogo mantiene los productos y lotes. Inventario registra las operaciones y consulta los movimientos. Uso el patrón Facade para que los controladores llamen a esas operaciones sin manejar la comunicación TCP. Para el acceso, un decorador marca las rutas públicas y un guard verifica la sesión en las demás. El JWT dura treinta minutos, viaja en una cookie HttpOnly y Axios incluye las credenciales en cada solicitud.

## 1:35–2:25 · Compra de dos productos

*En pantalla. En Compras, usa **Registrar producto** para crear Guantes de examen con el primer lote y costo de S/ 10.00. Cambia la cantidad a 20. Repite con Gasa estéril, el segundo lote y costo de S/ 4.00. Cambia la cantidad a 5. Confirma con **Registrar compra** y muestra el total de S/ 259.60.*

Estoy en Compras. Desde acá puedo crear un producto y agregarlo al documento sin perder lo que ya estaba registrando. Voy a ingresar veinte unidades de guantes a diez soles y cinco de gasa a cuatro. La compra queda en dos líneas y el total es de doscientos cincuenta y nueve soles con sesenta.

Al confirmar, SQL Server guarda juntos el documento y sus movimientos de entrada. En esa misma transacción actualiza el costo y calcula el precio de venta con el factor uno punto treinta y cinco. Así, los guantes que entraron a diez soles quedan con un precio de venta de trece con cincuenta.

## 2:25–3:30 · Venta y control de stock

*En pantalla. En Ventas, elige el lote de guantes y muestra sus 20 unidades disponibles. Ingresa 21 e intenta registrar la venta para mostrar el rechazo de la pantalla. Corrige a 2. Agrega una línea con 1 unidad de gasa. Registra la venta y muestra el total de S/ 70.63.*

En Ventas ya veo ese precio y las veinte unidades disponibles. Si intento sacar veintiuna, el formulario me avisa. Además, SQL vuelve a revisar el saldo al confirmar, porque entre lo que veo en pantalla y lo que guardo podría entrar el pedido de otro operador. Si ambos intentan usar las últimas unidades, el saldo se comprueba antes de registrar cada salida.

Corrijo la venta a dos guantes. Esa línea tiene un subtotal de veintisiete soles. Para ventas apliqué literalmente la fórmula del enunciado, que multiplica el subtotal por uno punto dieciocho en el campo IGV. Eso da treinta y uno con ochenta y seis de IGV y cincuenta y ocho con ochenta y seis en la línea. Agrego una gasa y registro ambos productos en una sola venta.

## 3:30–4:10 · Kardex y trazabilidad

*En pantalla. En Kardex, busca los dos lotes por el prefijo de la toma. Señala los saldos de 18 y 4. Abre el historial de los guantes para mostrar fecha, tipo y cantidad.*

Ya puedo cerrar la cuenta. El lote de guantes tiene dieciocho unidades y el de gasas tiene cuatro. En el historial de guantes veo cuándo entraron veinte y cuándo salieron dos. El saldo que aparece en la tabla sale de sumar las entradas y restar las salidas. Si alguien me pregunta de dónde sale ese número, le puedo mostrar los movimientos que lo explican.

## 4:10–5:00 · Pruebas y cierre

*En pantalla. Abre Swagger y la colección Postman. En la terminal ejecuta `node --env-file=.env scripts/smoke-test.mjs`. Señala las carpetas del proyecto, el README y el PDF de evaluación. Si ya publicaste el repositorio, muestra en GitHub la misma revisión que usaste para la demo.*

En Swagger queda el contrato de la API y en Postman dejé las solicitudes listas para recorrerlo. Esta prueba hace una compra y una venta, comprueba los importes y el Kardex, y verifica qué pasa si se repite una compra o si dos ventas compiten por el mismo saldo. En el repositorio también quedan los scripts de SQL y las instrucciones para levantar el entorno.

Para la operación local, el endpoint de salud comprueba los dos microservicios y su acceso a la base, y los logs quedan en Docker. En el PDF separé lo que corre hoy de la propuesta de monitoreo central e integración con los sistemas del hospital. Con eso cierro el recorrido. Gracias.

## Respuestas de apoyo para ampliar si te preguntan

- **Por qué dejé una base compartida.** El documento y el movimiento deberían quedar confirmados juntos. Una compra también cambia el costo y el precio de venta. Con una sola transacción mantengo esas operaciones consistentes. Catálogo e Inventario siguen teniendo entradas separadas y llaman al almacenamiento a través de puertos y adaptadores. El costo de esa decisión es que los cambios del esquema se coordinan entre ambos servicios.
- **Qué pasa si dos ventas consumen el mismo lote.** El procedimiento obtiene un bloqueo antes de consultar el saldo y lo mantiene hasta cerrar la transacción. La segunda venta lee el saldo que dejó la primera. Si ya no alcanza, recibe HTTP 409. En esta versión, el bloqueo ordena las escrituras de inventario incluso entre lotes distintos, así que es simple de verificar a costa de procesar menos escrituras simultáneas.
- **Qué pasa si la respuesta se pierde.** La interfaz reutiliza la clave `Idempotency-Key` cuando reenvía las mismas líneas. SQL devuelve el documento original. Si se reutiliza la misma clave con otro contenido, la API responde HTTP 409.
- **Dónde se decide el importe.** La pantalla calcula el estimado con centavos enteros. SQL Server usa decimales, redondea por línea y guarda el importe definitivo. En una venta toma el precio vigente en la base. Para compras usé 18 % de IGV como supuesto documentado y en ventas seguí el factor literal del enunciado.
- **Qué mostrar de SQL Server.** En `04-inventory.sql` está la transacción que registra documento y movimientos. En `02-audit.sql` se guardan los cambios de las tablas. `verify.sql` comprueba compras, ventas, stock y entradas de auditoría, y revierte los datos de la prueba. [Documentación SQL](../database/README.md)
- **Qué agregaría para un hospital.** Con OpenTelemetry seguiría una solicitud desde el gateway hasta los servicios y observaría tiempos de respuesta y errores. Para integrar HCE o HIS y ERP definiría contratos versionados, identificaría cada solicitud u orden con una referencia externa y contemplaría reintentos y conciliación. Eso deja claro quién es dueño de cada dato y permite detectar entregas duplicadas. [Evaluación teórica](evaluacion-teorica-hce.pdf)
