# Fix Summary

## Qué se hizo

1. Se separó el servicio de uploads en un servidor independiente: `upload-server.js`.
2. Se dejó el servidor de Next (`movies-app`) manejado por PM2 sin iniciar de nuevo el upload server desde `start-app.sh`.
3. Se creó `ecosystem.config.js` para que PM2 gestione:
   - `movies-app` (Next.js)
   - `movies-upload` (upload server)
   - `files-app` (tu otro servicio existente)
4. Se mejoró la robustez de `upload-server.js` para evitar errores con datos inesperados del multipart.
5. Se actualizó `start-app.sh` para respetar la variable `SKIP_UPLOAD_SERVER=true` cuando PM2 ya gestiona el upload server.

## Problemas específicos solucionados

### 1. `name.trim is not a function`
- En `upload-server.js`, la función `sanitizeName()` ahora convierte cualquier valor a string antes de aplicar `trim()`.
- En los callbacks de `busboy`, `fieldname` y `value` se normalizan explícitamente:
  - `fieldKey = typeof fieldname === "string" ? fieldname : String(fieldname)`
  - `fieldValue = typeof value === "string" ? value : String(value ?? "")`
- Esto evita que un campo multipart inesperado rompa el servidor.

### 2. `EADDRINUSE: address already in use :::3000`
- El error ocurrió porque PM2 intentaba iniciar dos veces el mismo puerto en el proceso principal.
- Se cambió `ecosystem.config.js` para que `movies-app` y `movies-upload` sean procesos independientes.
- `movies-app` ahora se inicia con `SKIP_UPLOAD_SERVER=true`, de modo que no relanza `upload-server.js`.

### 3. Problemas bajo PM2 vs ejecución directa
- El servicio funcionaba ejecutando el script directamente, pero fallaba en PM2 porque PM2 gestionaba el entorno y el doble lanzamiento.
- La configuración final separa claramente el proceso de Next del proceso de uploads, eliminando conflictos de entorno y puertos.

## Archivos clave

- `upload-server.js`
  - servidor HTTP independiente que procesa `POST /api/upload`
  - usa `busboy` para streaming directo a disco
  - maneja errores de request y de multipart correctamente
- `start-app.sh`
  - script de arranque principal
  - ahora evita iniciar el upload server si `SKIP_UPLOAD_SERVER=true`
- `ecosystem.config.js`
  - configuración PM2 final con tres apps: `movies-app`, `movies-upload`, `files-app`

## Resultado final

- El upload server funciona en `http://<host>:4000/api/upload`.
- La app Next funciona en `http://localhost:3000`.
- PM2 gestiona ambos procesos sin lanzar el upload server dos veces.
- El bug de `trim` en `sanitizeName()` ya está corregido.
