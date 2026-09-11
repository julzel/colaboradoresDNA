# Importación y descarga de colaboradores

Administración → Colaboradores → **Importar colaboradores** abre
`/admin/colaboradores/importar`. Solo administradores con MFA pueden usar la página
y su API. Descargá la [plantilla CSV](templates/colaboradores.csv) o usá el botón
**Descargar plantilla** dentro de la aplicación.

## Preparar el CSV

Una fila por persona, hasta 50 colaboradores y 128 KB por archivo. Usá UTF-8;
se aceptan BOM, saltos CRLF, comas o punto y coma, y celdas entre comillas.
No cambies los encabezados ni agregues columnas. Las columnas pueden reordenarse.
Guardá identificaciones y teléfonos como texto en Excel/Numbers para conservar
todos los dígitos.

| Columna              | Requerida | Formato                                                                         |
| -------------------- | --------- | ------------------------------------------------------------------------------- |
| nombre               | Sí        | Nombre(s), hasta 120 caracteres                                                 |
| primer_apellido      | Sí        | Hasta 120 caracteres                                                            |
| segundo_apellido     | No        | Hasta 120 caracteres                                                            |
| correo               | Sí        | Correo único de acceso                                                          |
| telefono             | No        | 8 dígitos nacionales o número con código de país                                |
| dia_cumpleanos       | Sí        | Día numérico válido para el mes                                                 |
| mes_cumpleanos       | Sí        | Número entre 1 y 12                                                             |
| tipo_identificacion  | Sí        | cedula, dimex u otro                                                            |
| identificacion       | Sí        | Cédula de 9 dígitos (con o sin guiones); DIMEX de 11–12 dígitos                 |
| fecha_ingreso        | Sí        | Fecha completa AAAA-MM-DD o AAAA/MM/DD                                          |
| departamento         | Sí        | Nombre de un departamento activo; listado en la página                          |
| puesto               | Sí        | Hasta 120 caracteres                                                            |
| saldo_inicial_dias   | Sí        | Saldo vigente con punto decimal, en incrementos de 0.5; admite cero y negativos |
| compartir_cumpleanos | Sí        | si o no                                                                         |

El archivo original `employees.csv` contiene nombres combinados, fechas de ingreso
sin día, cumpleaños escritos como texto y marcas de horario sin horas exactas.
También contiene salario, nacionalidad y porcentajes, que no forman parte del
modelo de importación. Separá los nombres y apellidos; completá los correos,
departamentos y fechas exactas; confirmá los cumpleaños y los saldos vigentes.
No se infiere el primer día del mes, la dirección de correo ni la jornada.

## Revisar y crear

1. Seleccioná el CSV y usá **Validar archivo**. No se crean registros en este paso.
2. Revisá cada fila y sus errores. Se validan los campos con las reglas del modelo,
   departamentos activos y duplicados de correo/documento, dentro del archivo y en
   la base de datos. Si hay errores, corregí el archivo y volvé a seleccionarlo.
3. Confirmá la creación. El servidor vuelve a validar antes de guardar.
4. Consultá el resultado por fila o descargalo como CSV. Las filas creadas incluyen
   enlace al detalle del colaborador.

Se crean personas activas con rol **Colaborador**, sin jefatura ni horario.
Las invitaciones quedan pendientes; no se envía correo durante la importación.
Configurá roles, jefaturas y horarios desde el detalle y enviá las invitaciones
cuando los registros estén revisados.

Cada fila guarda cuenta, colaborador, asignación, saldo inicial y auditoría del
administrador en una transacción MongoDB. La importación completa no es una sola
transacción: si una fila falla durante la creación, las filas exitosas permanecen
guardadas y se muestran en el resultado. Eliminá las filas creadas del CSV antes
de reintentar. Si se interrumpe la conexión, revisá el directorio y revalidá primero;
las restricciones únicas de correo y documento impiden duplicar registros.

## Descargas

- **Plantilla:** encabezados vacíos para nuevas personas; sin datos de ejemplo que
  puedan crearse por accidente.
- **Directorio:** todos los colaboradores, con código, nombre, departamento,
  puesto, jefatura, fecha de ingreso, estados y rol. No incluye identificaciones ni
  credenciales. Es un reporte, no un archivo para reimportar.
- **Resultados:** fila original, nombre, correo, estado, errores e ID creado.

Las descargas usan UTF-8 con BOM y escapan celdas que podrían interpretarse como
fórmulas. Los endpoints de descarga están autenticados y usan `private, no-store`.

## API

`GET /api/employees/bulk?download=template|directory` devuelve un archivo CSV.

`POST /api/employees/bulk` recibe JSON:

```json
{ "mode": "validate", "csv": "nombre,primer_apellido,...\n..." }
```

`mode` admite `validate` o `import`. La respuesta es
`{ data: { mode, canImport, rows } }`. Cada fila contiene `row`, `name`, `email`,
`status` (`valid`, `invalid`, `created`, `failed`), `errors` y opcionalmente
`employeeId`. Los errores de transporte son `{ error: string }`, con HTTP 400,
401, 403 o 500. Las filas inválidas se devuelven con HTTP 200 y `canImport: false`.
Se verifica origen en POST, rol y MFA en ambos métodos y tamaño real del cuerpo
antes de analizar JSON. Ningún dato personal se guarda en logs o almacenamiento
del navegador por este flujo.

La UI consume la API; parsing/validación viven en `domain/employee-csv.ts`, la
orquestación en `server/employee-import-service.ts` y la persistencia reutiliza
`createEmployeeWithAccess`. No hay una segunda implementación de creación.
