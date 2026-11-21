# Speech para el video del examen técnico HCE

Hola, soy [tu nombre]. Les cuento cómo funciona el sistema de inventario de insumos médicos que desarrollé. La idea es que, cuando alguien consulte cuántas unidades quedan de un lote, también pueda saber qué compras y ventas explican ese saldo.

El sistema organiza el trabajo en cuatro módulos. En Productos se mantiene el catálogo por lote. En Compras se registran varios insumos en un mismo documento y, si falta uno, se puede crear desde el formulario. En Ventas se consulta el precio vigente y el stock disponible antes de guardar. Y en el Kardex se puede consultar el saldo de cada lote y abrir su historial de movimientos.

Les doy un ejemplo de la prueba que hice. Registré una compra de veinte guantes a diez soles por unidad y cinco gasas a cuatro soles. Al guardar, se registró una entrada para cada lote y se actualizó el precio de venta. En el caso de los guantes, pasó a trece soles con cincuenta. Después vendí dos guantes y una gasa. El Kardex quedó con dieciocho guantes y cuatro gasas. Al consultar el movimiento de los guantes, figura la entrada de veinte y la salida de dos, cada una con su fecha.

Ahí aparece una decisión importante. El stock que se ve en pantalla puede cambiar antes de guardar. Por eso, SQL Server vuelve a consultar el saldo dentro de la misma transacción que registra la venta. Si dos operadores intentan vender las últimas unidades, la segunda operación comprueba el saldo que dejó la primera. Si ya no alcanza, el sistema rechaza la venta sin registrar una salida.

En cuanto a la arquitectura, usé Next.js para el portal y para la zona de operaciones. Desde el navegador se usa una sola aplicación, aunque son dos componentes que se despliegan por separado. El portal se comunica por HTTP con un gateway en NestJS, y el gateway llama por TCP a los microservicios de Catálogo e Inventario. Catálogo mantiene los productos e Inventario registra compras, ventas y movimientos. Docker Compose levanta esos componentes y SQL Server en un solo comando.

Elegí compartir la base de datos porque hay cambios que tienen que confirmarse juntos. En una compra, por ejemplo, se guardan el documento, la entrada de stock y el nuevo costo en la misma transacción. El código de cada servicio accede a la base a través de un adaptador. Para la sesión usé un JWT de treinta minutos en una cookie HttpOnly, y el gateway limita los intentos de inicio de sesión.

Para validar el flujo ejecuté una prueba integrada contra los servicios en Docker. La prueba registra una compra y una venta, comprueba los importes y verifica el saldo y los movimientos del Kardex. También repite una compra con la misma clave y comprueba que se devuelve el mismo documento. Por último, lanza dos ventas contra el mismo saldo y verifica que solo se confirme la que tiene stock suficiente.

Lo que quería demostrar con este ejercicio es que cada movimiento queda asociado a la operación que lo originó y que es posible explicar el saldo de un lote con su historial. Gracias por su tiempo.
