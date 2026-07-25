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
}

log "Iniciando script de despliegue"

# --- 0. Preparar Entorno ---
if [ -d "$FNM_DIR" ]; then
  export PATH="$FNM_DIR:$PATH"
  eval "$(fnm env --use-on-cd)"
  export PATH="$HOME/.local/share/pnpm:$PATH"
else
  error "fnm no encontrado en $FNM_DIR"
  exit 1
fi

cd "$APP_DIR" || { error "No se pudo entrar a $APP_DIR"; exit 1; }
log "Directorio actual: $(pwd)"

# --- 1. GIT UPDATE ---
log "Actualizando repositorio..."
git fetch origin "$BRANCH"

if git rev-parse --verify origin/"$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/"$BRANCH")

  if [ "$LOCAL" != "$REMOTE" ]; then
    log "Hay cambios nuevos, actualizando..."
    git pull origin "$BRANCH"
    UPDATE_OK=true
  else
    log "No hay cambios nuevos"
    UPDATE_OK=false
  fi
else
  log "Advertencia: no se pudo verificar rama remota"
  UPDATE_OK=false
fi

# --- 2. DEPENDENCIAS ---
INSTALL_OK=false

if [ "$UPDATE_OK" = true ]; then
  log "Instalando dependencias con pnpm..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
    INSTALL_OK=true
  else
    error "pnpm no está en el PATH"
    exit 1
  fi
else
  if [ -d "node_modules" ]; then
    log "Se omite instalación; node_modules ya existe"
    INSTALL_OK=true
  else
    error "No hay cambios y node_modules no existe; no se puede continuar"
    exit 1
  fi
fi

# --- 3. BUILD ---
if [ "$INSTALL_OK" = true ]; then
  log "Ejecutando build..."
  pnpm run build
else
  error "Instalación de dependencias fallida"
  exit 1
fi

# --- 4. START ---
log "Iniciando aplicación con pnpm start..."
export NODE_ENV=production
exec pnpm run start

