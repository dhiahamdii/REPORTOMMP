# Frontend — Next.js

Interface du système de rapports maintenance (formulaire manuel / entrée IA, exports HTML, **PDF**, Word, JSON).

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
cd frontend   # depuis la racine du dépôt : testreport/frontend
npm install
```

## Variables d'environnement (facultatif)

Créez `.env.local` :

```
NEXT_PUBLIC_API_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
```

- La page appelle **`/api/parse-text`** (route Next.js) pour l’analyse IA côté app ; **`NEXT_PUBLIC_API_URL`** sert aux appels **REST directs** au backend FastAPI (clients / rapports en base).

## Lancer en dev

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Les commandes doivent être exécutées **dans ce dossier** (`frontend`). La racine du dépôt ne contient pas de `package.json` projet.
