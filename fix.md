# Fix Summary

## Qué se hizo

1. Se consolidó el flujo de Home-Cinema en un solo proceso de Next.js.
2. Se eliminó el servicio de uploads independiente y el puerto extra `4000`.
3. Se actualizó `package.json` para eliminar el script `upload-server`.
4. Se dejó `ecosystem.config.js` solo con `movies-app` y `files-app`.
5. Se aseguró que el frontend use `/api/upload` en el mismo proceso Next.

## Problemas específicos solucionados

### 1. Uso de dos procesos innecesarios
- Se eliminó el segundo servicio independiente de uploads para evitar conflictos de PM2.
- Ahora todo se ejecuta bajo `movies-app` con `next start`.

### 2. Errores de configuración y puertos
- Ya no se usa `SKIP_UPLOAD_SERVER` ni el puerto `4000`.
- El build y el inicio dependen únicamente del proceso principal de Next.

### 3. Consistencia del frontend
- `UploadModal.tsx` ahora envía pedidos a `/api/upload` dentro del mismo servidor.
- Esto evita problemas de interpolación entre procesos y arranques fallidos.

## Archivos clave

- `src/app/api/upload/route.ts`
  - upload integrado en el route handler de Next
- `start-app.sh`
  - script de arranque principal, ahora solo inicia `pnpm run start`
- `ecosystem.config.js`
  - solo gestiona `movies-app` y `files-app`
- `package.json`
  - ya no contiene el script `upload-server`

## Resultado final

- Home-Cinema funciona como un solo proceso.
- No hay puerto `4000` extra ni servicio independiente.
- El upload de contenido se maneja desde el mismo servidor de Next.
