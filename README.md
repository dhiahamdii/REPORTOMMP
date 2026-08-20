# Maintenance Report System (frontend + backend)

Ce dépôt contient une application **Next.js** (répertoire `frontend`) et une API **FastAPI** (répertoire `backend`) pour les rapports de maintenance (profil OMMP / Huawei-Waycon possible via la couche IA).

## Prérequis installés sur la machine

| Composant | Version / note |
|-----------|----------------|
| **Node.js** | 20+ recommandé (pour Next.js 16) |
| **npm** | fourni avec Node |
| **Python** | **3.13 ou supérieur** (contrainte `backend/pyproject.toml`) |
| **pip** | installation des deps Python |

### Variables d'environnement

- **Frontend** (`frontend/.env.local`, optionnel)  
  - `NEXT_PUBLIC_API_URL` — URL de l’API FastAPI (défaut : `http://localhost:8000`)  
  - Aucune clé OpenAI côté Next : toute l’IA passe par le backend.

- **Backend** (`backend/.env`, chargé au démarrage de `main.py`)  
  - **OpenAI (payant)** : `OPENAI_API_KEY`  
  - **Sans payer OpenAI** : pointez vers un serveur **compatible API OpenAI**, p.ex. **Ollama** local — `OPENAI_BASE_URL=http://127.0.0.1:11434/v1`, `OPENAI_MODEL=llama3.2` (voir `backend/README.md`). **Groq** (quota gratuit) : URL Groq + clé console. Sans configuration utilisable, le serveur garde des réponses de secours (texte peu ou pas modifié).

## Structure

```
testreport/
├── frontend/     # Application Next.js (UI + export HTML / PDF / Word)
├── backend/      # API FastAPI + SQLite locale
├── README.md     # Ce fichier
└── backend/README.md
```

## Bash : lancer tout

### Terminal 1 — Backend (venv)

Voir les commandes détaillées dans **`backend/README.md`**. Résumé :

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install "fastapi>=0.136.1" "uvicorn>=0.46.0" "sqlalchemy>=2.0.49" "python-multipart>=0.0.27" "openai>=2.33.0" "ai>=1.2" "zod>=0.8.0"
export OPENAI_API_KEY="..."   # facultatif pour le parse Python backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

> Sur Windows sous **Git Bash**, `source .venv/Scripts/activate` remplace souvent la ligne `source .venv/bin/activate`.

### Terminal 2 — Frontend

```bash
cd frontend
npm install
# optionnel
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm run dev
```

Interface : **http://localhost:3000**  
API docs : **http://localhost:8000/docs**

## Exports fichiers

- **HTML / Word (.docx) / PDF** : boutons depuis l’écran de rapport.  
- **PDF** : généré côté navigateur (`jspdf` + `jspdf-autotable`) ; utilisez **PNG/JPEG** pour les logos lorsque vous voulez des images incluses sans surprise.

## Déploiement (cloud privé / Elastic IP)

Voir **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Docker Compose + nginx (port 80 unique), volume SQLite persistant, CORS et variables IA.

Résumé :

```bash
cd deploy && cp .env.example .env   # renseigner IP + clés
docker compose up -d --build
# → http://VOTRE_IP_ELASTIQUE/
```

## Développement supplémentaire

- Lint frontend : `cd frontend && npm run lint`
- Build frontend : `cd frontend && npm run build`
# REPORTOMMP
