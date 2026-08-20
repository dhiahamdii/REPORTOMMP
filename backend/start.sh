#!/usr/bin/env bash
# Relance le serveur avec le code à jour (évite 404 sur /api/ports après git pull)
cd "$(dirname "$0")"
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
