# Déploiement cloud privé (Elastic IP)

Ce guide décrit comment exposer l’application sur **une IP publique fixe (Elastic IP)** avec un seul point d’entrée HTTP (port 80).

## Architecture

```
Internet / réseau privé
        │
        ▼
  Elastic IP (ex. 203.0.113.42)
        │
        ▼
   VM / instance (port 80)
        │
   ┌────┴────┐
   │  nginx  │
   └────┬────┘
        ├── /      → Next.js (frontend:3000)
        └── /api/* → FastAPI (backend:8000)
```

- **SQLite** : fichier persistant dans le volume Docker `ommp-db`.
- **Logos** : `frontend/public/logos/` (déjà dans l’image frontend).
- **IA** : clés uniquement côté backend (`OPENAI_*`).

## Prérequis sur la VM

- Docker + Docker Compose v2
- Elastic IP associée à l’interface de la VM
- Pare-feu : autoriser **TCP 80** (et 443 si vous ajoutez TLS plus tard)
- Ne pas exposer 3000 / 8000 directement sur Internet

## Déploiement rapide (Docker)

```bash
cd deploy
cp .env.example .env
# Éditer .env : PUBLIC_ORIGIN, CORS_ORIGINS, OPENAI_API_KEY, etc.

docker compose up -d --build
docker compose ps
```

Accès :

| Service | URL |
|---------|-----|
| Application | `http://VOTRE_IP_ELASTIQUE/` |
| API (via nginx) | `http://VOTRE_IP_ELASTIQUE/api/health` |
| Swagger | `http://VOTRE_IP_ELASTIQUE/docs` |

## Variables importantes

### `deploy/.env`

| Variable | Description |
|----------|-------------|
| `HTTP_PORT` | Port local mappé (défaut `80`) |
| `CORS_ORIGINS` | Origine du navigateur, ex. `http://203.0.113.42` |
| `OPENAI_API_KEY` | Clé Groq / OpenAI (jamais dans le frontend) |
| `NEXT_PUBLIC_API_URL` | **Laisser vide** si tout passe par nginx sur la même IP |

### Frontend

Si `NEXT_PUBLIC_API_URL` est vide, le navigateur appelle `/api/...` sur la même IP ; nginx ou le rewrite Next redirige vers le backend.

### Backend

- `DATABASE_URL=sqlite:////data/maintenance_reports.db` (volume Docker)
- `CORS_ORIGINS` doit inclure l’URL exacte utilisée dans le navigateur (`http://IP`, pas `*` en prod si cookies)

## Mise à jour

```bash
cd deploy
git pull   # ou copier les nouveaux fichiers
docker compose up -d --build
```

## Sauvegarde base de données

```bash
docker compose exec backend ls -la /data
docker cp $(docker compose ps -q backend):/data/maintenance_reports.db ./backup-$(date +%F).db
```

## Déploiement sans Docker (systemd)

### Backend

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r <(grep -E '^[a-z]' pyproject.toml | sed 's/.*"\(.*\)".*/\1/')
cp .env.example .env   # adapter DATABASE_URL, CORS, OPENAI_*
export DATABASE_URL=sqlite:////var/lib/ommp/maintenance_reports.db
mkdir -p /var/lib/ommp
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm ci
# NEXT_PUBLIC_API_URL vide si nginx proxy /api
export BACKEND_PROXY_URL=http://127.0.0.1:8000
npm run build
npm start -- -H 0.0.0.0 -p 3000
```

Configurer nginx comme dans `deploy/nginx.conf` en pointant `127.0.0.1:3000` et `127.0.0.1:8000`.

## Sécurité (recommandations)

1. Restreindre l’accès réseau (VPN, bastion, ou pare-feu source IP).
2. Ajouter **HTTPS** (Let’s Encrypt ou certificat interne) devant nginx.
3. Ne pas committer `backend/.env` ni `deploy/.env`.
4. Sauvegardes régulières du fichier SQLite.
5. Sur Groq/OpenAI : limiter la clé et surveiller les quotas.

## Dépannage

| Problème | Piste |
|----------|--------|
| Page blanche / API 404 | Vérifier `docker compose logs nginx frontend backend` |
| CORS bloqué | `CORS_ORIGINS` = URL exacte (`http://IP`, avec port si non-80) |
| Ports déjà utilisés | `HTTP_PORT=8080` dans `.env` ou libérer le port 80 |
| Données perdues au redéploiement | Vérifier le volume `ommp-db` dans `docker compose.yml` |
