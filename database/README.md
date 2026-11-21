# SQL Server 2022

`init.sql` es el punto de entrada para SQLCMD. Desde este directorio, ejecutar `sqlcmd -S <servidor> -U <usuario> -C -b -d master -i init.sql` con la contraseña en `SQLCMDPASSWORD`. En Docker Compose, `db-init` ejecuta el mismo script tras comprobar la disponibilidad de SQL Server.

| Archivo | Contenido |
| --- | --- |
| `01-schema.sql` | Base, siete tablas de inventario, auditoría, restricciones, índices y vistas. |
| `02-audit.sql` | Disparadores de inserción, actualización y eliminación para las siete tablas. |
| `03-catalog.sql` | Alta, lectura, edición parcial y eliminación de productos sin historial. |
| `04-inventory.sql` | Registro de compras y ventas, listados, detalles y Kardex. |
| `05-demo.sql` | Tres productos ficticios y una compra inicial que se crea una sola vez. |
| `queries.sql` | Consultas listas para ejecutar sobre productos, compras, ventas, Kardex y auditoría. |
| `verify.sql` | Prueba importes, actualización de precios, Kardex, auditoría, idempotencia y rechazo por stock. Revierte los datos de prueba. |

## Decisiones

- La fecha de registro se guarda en UTC. Cada compra y venta se registra junto con una entrada o salida que referencia su documento mediante claves foráneas. El Kardex calcula el stock como la suma de entradas menos la suma de salidas.
- La transacción abarca cabecera, detalles, movimiento, auditoría y, al comprar, actualización de costo y precio de venta. Un bloqueo transaccional compartido por los procedimientos de compra y venta ordena los cambios de stock. También se bloquean los productos afectados para mantener su precio vigente durante el registro. Esta granularidad global mantiene una implementación simple para la prueba local y limita la concurrencia de las escrituras.
- Las compras calculan IGV al 18 % como supuesto del ejercicio. En ventas se sigue la fórmula escrita en el enunciado con factor 1.18 para la columna IGV y total igual a subtotal más IGV. Se redondea cada línea a dos decimales antes de sumar la cabecera. El precio de venta es el costo de la última compra multiplicado por 1.35 y redondeado a dos decimales.
- El total máximo por documento es S/ 9 999 999 999 999.99. En ese rango el cliente puede representar y mostrar cada centavo como número JSON. Si el total excede el máximo, SQL rechaza la operación completa con el error 51003.
- La clave opcional UUID de una compra o venta devuelve el documento existente al repetir las mismas líneas, aunque cambie su orden. Si cambia el contenido, el procedimiento devuelve el error 51005. El 51002 indica stock insuficiente y el 51006 indica que venció la espera por el bloqueo.
- Cada trigger registra los conjuntos de filas anteriores y posteriores a la sentencia en JSON, la fecha y el principal SQL. Se admite el contexto de sesión opcional `usuario` para correlación con una identidad de aplicación. Las compras, ventas y movimientos conservan su historial.
