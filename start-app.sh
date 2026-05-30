#!/bin/bash

# --- Configuración ---
APP_DIR="/home/miguel/Desktop/Local-Apps/Home-Cinema"
BRANCH="production"
export FNM_DIR="/home/miguel/.local/share/fnm"

# --- 0. Preparar Entorno ---
if [ -d "$FNM_DIR" ]; then
  export PATH="$FNM_DIR:$PATH"
  eval "$(fnm env --use-on-cd)"
  # Esto asegura que pnpm esté disponible tras cargar Node
  export PATH="$HOME/.local/share/pnpm:$PATH" 
else
  echo "Error: fnm no encontrado en $FNM_DIR"
  exit 1
fi

# Entrar al directorio del proyecto
cd "$APP_DIR" || { echo "Error: No se pudo entrar a $APP_DIR"; exit 1; }

echo "Iniciando proceso Next.js en $(pwd)"

# --- 1. GIT UPDATE ---
echo "Actualizando repositorio..."
git fetch origin "$BRANCH"

if git rev-parse --verify origin/$BRANCH >/dev/null 2>&1; then
  git checkout "$BRANCH"

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/$BRANCH)

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Hay cambios nuevos, actualizando..."
    if git pull origin "$BRANCH"; then
      UPDATE_OK=true
    else
      echo "Advertencia: falló git pull"
      UPDATE_OK=false
    fi
  else
    echo "No hay cambios nuevos"
    UPDATE_OK=false
  fi
else
  echo "Advertencia: no se pudo verificar rama remota"
  UPDATE_OK=false
fi

# --- 2. DEPENDENCIAS ---
INSTALL_OK=false

if [ "$UPDATE_OK" = true ]; then
  echo "Instalando dependencias con pnpm..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install && INSTALL_OK=true || echo "Error: pnpm install falló"
  else
    echo "Error: pnpm no está en el PATH"
  fi
else
  echo "Se omite instalación (sin cambios o error en git)"
  # Si ya existe node_modules, podemos intentar build
  [ -d "node_modules" ] && INSTALL_OK=true
fi

# --- 3. BUILD ---
if [ "$INSTALL_OK" = true ]; then
  echo "Ejecutando build..."
  if ! pnpm run build; then
    echo "Error: build falló"
    exit 1
  fi
else
  echo "Se omite build por falta de dependencias"
fi

# --- 4. START ---
echo "Iniciando servicio de uploads dedicado..."
if [ -f "upload-server.js" ]; then
  node upload-server.js &
  UPLOAD_PID=$!
  echo "Upload server iniciado en segundo plano (PID=$UPLOAD_PID)"
else
  echo "Advertencia: upload-server.js no se encontró, el servicio de uploads no se iniciará"
fi

echo "Iniciando aplicación con pnpm start..."
# Usamos exec para que PM2 gestione directamente el proceso de la app
exec pnpm run start

