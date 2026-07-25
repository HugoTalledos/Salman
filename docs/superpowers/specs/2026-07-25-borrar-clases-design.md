# Borrado de clases desde la pantalla principal

## Objetivo

Permitir que una persona borre una clase desde el listado “Mis clases” de la
pantalla principal, con una confirmación explícita que reduzca el riesgo de
borrados accidentales.

## Experiencia de usuario

Cada fila del listado conserva su acción principal de abrir la clase y añade,
a la derecha, un botón visible con icono de papelera y nombre accesible
“Borrar clase”.

Al activar el botón se abre un diálogo propio de Salman. El diálogo:

- muestra el título `¿Borrar “<título de la clase>”?`;
- avisa que se borrarán la clase y todos sus recursos;
- indica que la acción no se puede deshacer;
- ofrece “Cancelar” como acción segura y “Borrar” como acción destructiva.

Cancelar cierra el diálogo sin hacer cambios. Confirmar llama a la API y
deshabilita ambas acciones mientras el borrado está en curso. Tras una
respuesta satisfactoria, el diálogo se cierra y la clase desaparece del
listado sin recargar la página. Si la petición falla, el diálogo permanece
abierto, la clase sigue en el listado y se muestra el mensaje de error para
permitir cancelar o reintentar.

El diálogo tendrá semántica accesible, asociará título y descripción, recibirá
el foco al abrirse y podrá cerrarse con Escape cuando no haya un borrado en
curso.

## Arquitectura y flujo

La interfaz añadirá `api.borrarProyecto(carpeta)` y enviará
`DELETE /api/proyectos/:carpeta`. La pantalla `Inicio` mantendrá el proyecto
seleccionado para borrado y actualizará localmente su estado después de una
respuesta correcta.

El servidor incorporará:

1. un contrato de caso de uso `BorrarProyecto`;
2. una implementación que delegue en `ProyectoRepository`;
3. el método `borrar(carpeta)` en el repositorio;
4. una ruta `DELETE /api/proyectos/:carpeta`.

El repositorio validará que `carpeta` sea un nombre simple, verificará que el
proyecto exista y eliminará de forma recursiva únicamente su directorio dentro
de la base configurada. Esto incluye `clase.salman`, recursos y artefactos
compilados. Un proyecto inexistente responderá con el error de dominio
`ProyectoNoExiste`, que la capa HTTP ya traduce a 404. Una eliminación correcta
responderá con estado 204 y cuerpo vacío.

## Límites

El borrado es definitivo. No se añade papelera, restauración, selección
múltiple, borrado desde el editor ni notificación global. El diálogo de
confirmación es la única protección incluida en este cambio.

## Pruebas

Las pruebas automatizadas comprobarán:

- que el repositorio elimina el directorio completo y rechaza rutas inválidas
  o proyectos inexistentes;
- que el endpoint devuelve 204, deja de listar la clase y devuelve 404 para
  una clase inexistente;
- que el botón abre el diálogo con el título correcto;
- que cancelar conserva la clase;
- que confirmar llama a la API y retira la clase del listado;
- que un error conserva tanto el diálogo como la clase y muestra el mensaje.

La verificación final ejecutará las pruebas, el chequeo de tipos, el linter y
la compilación del proyecto.
