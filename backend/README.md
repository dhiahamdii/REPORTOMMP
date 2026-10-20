# Backend — FastAPI (`main.py`)

API maintenance : clients, rapports, santé `/api/health`, etc. Base **SQLite** : `maintenance_reports.db` (créée au premier lancement dans ce répertoire).

## Prérequis installés

- **Python ≥ 3.13** (`requires-python = ">=3.13"` dans `pyproject.toml`)
- `pip`

Dépendances principales déclarées dans `pyproject.toml` :

- fastapi, uvicorn, sqlalchemy, python-multipart, openai, ai, zod

## Bash + venv (Linux / macOS / Git Bash)

```bash
cd backend   # testreport/backend

python3.13 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install "fastapi>=0.136.1" "uvicorn>=0.46.0" "sqlalchemy>=2.0.49" \
  "python-multipart>=0.0.27" "openai>=2.33.0" "ai>=1.2" "zod>=0.8.0"
```

Ou, si vous utilisez **`uv`** (mentionné dans `start.sh` du projet) :

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

## Lancer le serveur

```bash
source .venv/bin/activate   # si vous utilisez venv classique
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Le fichier **`backend/.env`** est chargé au démarrage (`python-dotenv` dans `pyproject.toml`). Voir ci-dessous pour **OpenAI payant** ou **Ollama / autre API compatible (souvent gratuit)**.

- Documentation interactive : http://localhost:8000/docs  
- Le frontend (dossier `../frontend`) attend en général l’API sur **http://localhost:8000** (`NEXT_PUBLIC_API_URL`).

### Fournisseur LLM (`backend/.env`)

Le SDK **OpenAI** parle à une API **compatible** (même format `/v1/chat/completions`).

| Cas | Variables typiques |
|-----|---------------------|
| **OpenAI** (facturation) | `OPENAI_API_KEY=sk-...` (optionnel : `OPENAI_BASE_URL` par défaut `https://api.openai.com/v1`) |
| **Ollama** (local, sans tokens) | `OPENAI_BASE_URL=http://127.0.0.1:11434/v1` et `OPENAI_MODEL=llama3.2` (ou un modèle listé par `ollama list`). Pas besoin de vraie clé ; vous pouvez laisser `OPENAI_API_KEY` vide ou mettre `ollama`. |
| **Groq** (quota gratuit) | `OPENAI_BASE_URL=https://api.groq.com/openai/v1` et `OPENAI_API_KEY=` clé [console.groq.com](https://console.groq.com), `OPENAI_MODEL=openai/gpt-oss-20b` (les anciens `llama-3.1-8b-instant` / `llama-3.3-70b-versatile` sont retirés du tier gratuit). Si un modèle est indisponible, le backend essaie automatiquement des modèles de repli. |

Variable **`OPENAI_MODEL`** : défaut `gpt-4o-mini` (adapté à OpenAI uniquement). Avec Ollama, alignez le nom sur un modèle **tiré** (`ollama pull llama3.2`).

**Ne mettez pas** la clé secrète dans Next.js ; uniquement côté Python.

### IA (tout côté backend)

- `POST /api/parse-text` — analyse de texte brut (OMMP / champs structurés).  
- `POST /api/refine-french` — correction orthographique légère (`{ "text": "..." }` → `{ "text": "...", "fallback": bool }`).  
- `POST /api/next-prev-ref` — aperçu ou attribution `PREV_MMM_YYYY_NN` (`{ "date": "YYYY-MM-DD?", "allocate": false|true }`).  
- `GET/POST/PUT/DELETE /api/ports` — annuaire ports et contacts (page **Ports & contacts** du frontend).

Les clés / URLs ci-dessus restent **uniquement** dans l’environnement Python (pas dans Next.js).

**Après modification du code backend**, redémarrez uvicorn (`Ctrl+C` puis relancer) pour charger les nouvelles routes — sinon `/api/ports` renvoie 404.

## Note Windows (PowerShell)

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install "fastapi>=0.136.1" "uvicorn>=0.46.0" "sqlalchemy>=2.0.49" "python-multipart>=0.0.27" "openai>=2.33.0" "ai>=1.2" "zod>=0.8.0"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Git Bash sur Windows (`source`)

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install ...
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
