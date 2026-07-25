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

log "Iniciando script de despliegue (modo conservador)"

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

# --- 1. GIT: Priorizar remoto (descartar cambios locales) ---
log "Actualizando repositorio desde remoto (priorizando la nube)"
git fetch origin "$BRANCH" || error "Falló git fetch"

# Verificar que la rama remota exista
if ! git rev-parse --verify origin/"$BRANCH" >/dev/null 2>&1; then
  error "La rama remota origin/$BRANCH no existe"
fi

# Forzar que el directorio refleje exactamente el remoto (descarta cambios locales)
git reset --hard origin/"$BRANCH" || error "Falló git reset --hard"
# Asegurarse de estar en la rama correcta (por si no existía localmente)
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" origin/"$BRANCH"
# Pull por si acaso (aunque ya estamos sincronizados)
git pull --ff-only origin "$BRANCH" || log "Advertencia: pull no necesario (ya actualizado)"

# --- 2. Instalación y build SIEMPRE (para garantizar estado) ---
log "Instalando dependencias con pnpm (siempre)..."
pnpm install || error "Falló pnpm install"

log "Ejecutando build (siempre)..."
pnpm run build || error "Falló el build"

# --- 3. Iniciar aplicación en foreground (para que PM2 lo gestione) ---
log "Iniciando aplicación con pnpm start (en foreground para PM2)..."
export NODE_ENV=production
exec pnpm run start