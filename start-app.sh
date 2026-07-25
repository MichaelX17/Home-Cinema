#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# --- Configuración ---
APP_DIR="/home/miguel/Desktop/Local-Apps/Home-Cinema"
BRANCH="production"
PORT=3000
MAX_RETRIES=3
RETRY_DELAY=5
export FNM_DIR="/home/miguel/.local/share/fnm"

log() {
  printf '%s %s\n' "[$(date +'%Y-%m-%d %H:%M:%S')]" "$*"
}

error() {
  log "ERROR: $*" >&2
  exit 1
}

# Función para esperar a que el puerto esté libre
wait_for_port() {
  local port=$1
  local timeout=10  # segundos
  local waited=0
  while [ $waited -lt $timeout ]; do
    if command -v lsof >/dev/null 2>&1; then
      if ! lsof -ti :"$port" >/dev/null 2>&1; then
        log "Puerto $port libre después de ${waited}s"
        return 0
      fi
    else
      # Fallback con netstat
      if ! netstat -tulpn 2>/dev/null | grep -q ":$port "; then
        log "Puerto $port libre después de ${waited}s"
        return 0
      fi
    fi
    sleep 1
    waited=$((waited + 1))
  done
  log "Timeout esperando que el puerto $port se libere"
  return 1
}

# --- Preparar Entorno ---
if [ -d "$FNM_DIR" ]; then
  export PATH="$FNM_DIR:$PATH"
  eval "$(fnm env --use-on-cd)"
  export PATH="$HOME/.local/share/pnpm:$PATH"
else
  error "fnm no encontrado en $FNM_DIR"
fi

for cmd in git pnpm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    error "$cmd no está en el PATH"
  fi
done

cd "$APP_DIR" || error "No se pudo entrar a $APP_DIR"
log "Directorio actual: $(pwd)"

# Cargar .env.production si existe
if [ -f ".env.production" ]; then
  log "Cargando variables de entorno desde .env.production"
  set -a
  # shellcheck source=/dev/null
  source .env.production
  set +a
fi

# --- GIT: Priorizar remoto ---
log "Actualizando repositorio desde remoto"
git fetch origin "$BRANCH" || error "Falló git fetch"
if ! git rev-parse --verify origin/"$BRANCH" >/dev/null 2>&1; then
  error "La rama remota origin/$BRANCH no existe"
fi
git reset --hard origin/"$BRANCH" || error "Falló git reset --hard"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" origin/"$BRANCH"
git pull --ff-only origin "$BRANCH" || log "Advertencia: pull no necesario"

# --- Instalación y build ---
log "Instalando dependencias (--frozen-lockfile)..."
pnpm install --frozen-lockfile || error "Falló pnpm install"

log "Ejecutando build..."
pnpm run build || error "Falló el build"

# --- Liberar puerto antes de iniciar ---
log "Verificando y liberando puerto $PORT..."
# Matar procesos que usen el puerto (si hay)
if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -ti :"$PORT" || true)
  if [ -n "$PID" ]; then
    log "Matando proceso $PID que usa el puerto $PORT"
    kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
    sleep 2
  fi
fi

# Esperar activamente a que el puerto esté libre
if ! wait_for_port "$PORT"; then
  error "No se pudo liberar el puerto $PORT"
fi

# --- Iniciar con reintentos ---
export NODE_ENV=production
attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
  log "Intento $attempt de $MAX_RETRIES: iniciando aplicación..."
  
  # Lanzamos el proceso en background para poder capturar su salida y esperar
  pnpm run start -- --port "$PORT" --hostname 0.0.0.0 &
  APP_PID=$!
  
  # Esperar unos segundos para ver si arranca correctamente (sin fallo inmediato)
  sleep 5
  
  # Verificar si el proceso sigue vivo
  if kill -0 $APP_PID 2>/dev/null; then
    log "Aplicación iniciada correctamente (PID $APP_PID). Pasando el control a PM2."
    # Ahora hacemos exec para que PM2 tome el control del proceso
    exec pnpm run start -- --port "$PORT" --hostname 0.0.0.0
    # Nota: exec reemplazará el script, por lo que el resto no se ejecutará.
    # Pero como ya hemos verificado que funciona, podemos hacer exec directamente.
    # Mejor: directamente exec sin el background.
  else
    log "El proceso murió antes de estabilizarse. Reintentando en $RETRY_DELAY segundos..."
    sleep $RETRY_DELAY
    attempt=$((attempt + 1))
  fi
done

# Si llegamos aquí, todos los intentos fallaron
error "No se pudo iniciar la aplicación después de $MAX_RETRIES intentos"