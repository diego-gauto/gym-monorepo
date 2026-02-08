#!/bin/bash
# Libera puertos y arranca el proyecto en modo desarrollo

set -e
cd "$(dirname "$0")/.."

echo "Liberando puertos 3000 y 3001..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
rm -f apps/web/.next/dev/lock
sleep 2

echo "Iniciando proyecto..."
pnpm dev
