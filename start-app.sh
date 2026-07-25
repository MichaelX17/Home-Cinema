#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# --- Configuración ---
APP_DIR="/home/miguel/Desktop/Local-Apps/Home-Cinema"
BRANCH="production"
export FNM_DIR="/home/miguel/.local/share/fnm"

log() {
  printf '%s %s\n' "[$(date +'%Y-%m-%d %H:%M:%S')]" "$*"
}

error() {
  log "ERROR: $*" >&2
  exit 1
}

log "Iniciando script de despliegue para movies-app"

# --- Preparar Entorno ---
if [ -d "$FNM_DIR" ]; then
  export PATH="$FNM_DIR:$PATH"
  eval "$(fnm env --use-on-cd)"
  export PATH="$HOME/.local/share/pnpm:$PATH"
else
  error "fnm no encontrado en $FNM_DIR"
fi

# Verificar comandos necesarios
for cmd in git pnpm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    error "$cmd no está en el PATH"
  fi
done

cd "$APP_DIR" || error "No se pudo entrar a $APP_DIR"
log "Directorio actual: $(pwd)"

# Cargar .env.production si existe (opcional)
if [ -f ".env.production" ]; then
  log "Cargando .env.production"
  set -a
  # shellcheck source=/dev/null
  source .env.production
  set +a
fi

# --- 1. GIT (priorizar remoto) ---
log "Actualizando repositorio desde remoto"
git fetch origin "$BRANCH" || error "Falló git fetch"
if ! git rev-parse --verify origin/"$BRANCH" >/dev/null 2>&1; then
  error "La rama remota origin/$BRANCH no existe"
fi
git reset --hard origin/"$BRANCH" || error "Falló git reset --hard"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" origin/"$BRANCH"
git pull --ff-only origin "$BRANCH" || log "Advertencia: pull no necesario"

# --- 2. Instalación y build (siempre) ---
log "Instalando dependencias (--frozen-lockfile)..."
pnpm install --frozen-lockfile || error "Falló pnpm install"

log "Ejecutando build..."
pnpm run build || error "Falló el build"

# --- 3. Liberar puerto (usar el definido en el ecosistema) ---
PORT=${PORT:-3000}
log "Puerto configurado: $PORT"

# Función para esperar a que el puerto esté libre (máx 10 segundos)
wait_for_port() {
  local port=$1
  for i in {1..10}; do
    if command -v lsof >/dev/null 2>&1; then
      if ! lsof -ti :"$port" >/dev/null 2>&1; then
        return 0
      fi
    else
      if ! netstat -tulpn 2>/dev/null | grep -q ":$port "; then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

# Matar procesos que usen el puerto
if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -ti :"$PORT" || true)
  if [ -n "$PID" ]; then
    log "Matando proceso $PID que usa el puerto $PORT"
    kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
    sleep 2
  fi
fi

if ! wait_for_port "$PORT"; then
  error "No se pudo liberar el puerto $PORT después de 10s"
else
  log "Puerto $PORT libre"
fi

# --- 4. Iniciar aplicación en foreground (con variable de entorno) ---
export NODE_ENV=${NODE_ENV:-production}
log "Iniciando Next.js en el puerto $PORT (desde variable de entorno)"
exec pnpm run start