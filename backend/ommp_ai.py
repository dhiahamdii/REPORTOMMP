"""
IA OMMP : client HTTP compatible API OpenAI (OpenAI payant, Ollama local gratuit, Groq, etc.).
Variables : OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL (voir README backend).
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from models import InterventionCounter

# API officielle OpenAI (sans OPENAI_BASE_URL)
_DEFAULT_OPENAI_API = "https://api.openai.com/v1"

# Longueur max affichée dans le terminal (réponses très longues tronquées)
_TERMINAL_AI_SNIP = 14_000


def _terminal_ai_block(title: str, parts: list[tuple[str, str]]) -> None:
    """Affiche dans le terminal (stdout uvicorn) le flux IA pour le débogage."""
    bar = "=" * 72
    chunks = [f"\n{bar}", f" [AI] {title}", bar]
    for label, body in parts:
        b = body if body else "(vide)"
        if len(b) > _TERMINAL_AI_SNIP:
            b = b[:_TERMINAL_AI_SNIP] + f"\n… [tronqué, {len(body)} caractères au total]"
        chunks.append(f"\n--- {label} ---\n{b}")
    chunks.append(f"\n{bar}\n")
    print("".join(chunks), flush=True)


def _chat_base_url() -> str:
    return (os.getenv("OPENAI_BASE_URL") or _DEFAULT_OPENAI_API).strip().rstrip("/")


def _is_official_openai() -> bool:
    return _chat_base_url().rstrip("/") == _DEFAULT_OPENAI_API.rstrip("/")


def _chat_api_key_for_client() -> str:
    """Sur api.openai.com la clé est obligatoire. Sur Ollama / autre hôte, clé factice acceptée."""
    key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if key:
        return key
    if not _is_official_openai():
        return (os.getenv("OPENAI_COMPAT_API_KEY") or "ollama").strip() or "ollama"
    return ""


# Modèles de repli si OPENAI_MODEL est obsolète (ex. Groq « decommissioned » / model_not_found)
_GROQ_FALLBACK_MODELS = (
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
)


def _chat_model() -> str:
    configured = (os.getenv("OPENAI_MODEL") or "").strip()
    if configured:
        return configured
    if "groq.com" in _chat_base_url():
        return "openai/gpt-oss-20b"
    return "gpt-4o-mini"


def _is_model_unavailable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "decommissioned" in msg
        or "model_decommissioned" in msg
        or "model_not_found" in msg
        or "does not exist" in msg
        or "do not have access" in msg
    )


def _chat_completion_with_fallback(
    client,
    messages: list[dict[str, str]],
    temperature: float,
    *,
    response_format_json: bool = False,
):
    """Appelle le LLM ; en cas de modèle Groq retiré, essaie les modèles de repli."""
    models: list[str] = []
    primary = _chat_model()
    if primary:
        models.append(primary)
    if "groq.com" in _chat_base_url():
        for m in _GROQ_FALLBACK_MODELS:
            if m not in models:
                models.append(m)

    last_exc: Exception | None = None
    for model in models:
        try:
            if response_format_json:
                return _chat_completion_parse(client, model, messages, temperature)
            return client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
            )
        except Exception as e:
            last_exc = e
            if _is_model_unavailable(e):
                print(
                    f"[WARNING] Modèle {model!r} indisponible — essai suivant."
                )
                continue
            raise
    if last_exc:
        raise last_exc
    raise RuntimeError("Aucun modèle LLM configuré")


def _llm_client():
    """
    Client SDK OpenAI pointant vers OPENAI_BASE_URL (OpenAI, Groq, Ollama OpenAI-compat, etc.).
    Retourne None si api.openai.com est visé sans OPENAI_API_KEY.
    """
    from openai import OpenAI

    if _is_official_openai() and not (os.getenv("OPENAI_API_KEY") or "").strip():
        return None
    return OpenAI(api_key=_chat_api_key_for_client(), base_url=_chat_base_url())


def _llm_log_suffix() -> str:
    return f"{_chat_base_url()} · {_chat_model()}"


def _chat_completion_parse(client, model: str, messages: list[dict[str, str]], temperature: float):
    """Parse JSON : tente response_format json_object, puis sans (compat Ollama / petits modèles)."""
    try:
        return client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        print(f"[WARNING] response_format json_object refusé ({e!s}) — nouvel essai sans ce paramètre.")
        return client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )


OMMP_PROJECT_TITLE_PREFIX = (
    "FOURNITURE, INSTALLATION ET LA MISE EN SERVICES DES EQUIPEMENTS DE "
    "SECURISATION DES ACCES TERRESTRES ET MARITIMES DES PORTS DE"
)

MONTH_SHORT_EN = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
]

MARQUE_TACHE_FIN = r"$\checkmark$"


def build_ommp_project_title(port_name: str) -> str:
    p = port_name.strip().upper()
    return f"{OMMP_PROJECT_TITLE_PREFIX} {p}" if p else ""


def _parse_iso_to_dt(iso: str) -> datetime:
    s = (iso or "").strip()
    if not s:
        return datetime.utcnow()
    if "T" not in s:
        s = f"{s}T12:00:00"
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return datetime.utcnow()


def parse_request_date(date_str: Optional[str]) -> datetime:
    """Date pour PREV : corps de requête ou maintenant (UTC)."""
    if not date_str or not str(date_str).strip():
        return datetime.utcnow()
    return _parse_iso_to_dt(str(date_str).strip())


def peek_intervention_ref(db: Session, dt: datetime) -> str:
    mmm = MONTH_SHORT_EN[dt.month - 1]
    year = dt.year
    row = (
        db.query(InterventionCounter)
        .filter(InterventionCounter.month == mmm, InterventionCounter.year == year)
        .first()
    )
    c = row.counter if row else 0
    return f"PREV_{mmm}_{year}_{c + 1:02d}"


def allocate_intervention_ref(db: Session, dt: datetime) -> str:
    mmm = MONTH_SHORT_EN[dt.month - 1]
    year = dt.year
    row = (
        db.query(InterventionCounter)
        .filter(InterventionCounter.month == mmm, InterventionCounter.year == year)
        .first()
    )
    if row is None:
        row = InterventionCounter(month=mmm, year=year, counter=0)
        db.add(row)
        db.flush()
    row.counter += 1
    db.commit()
    db.refresh(row)
    return f"PREV_{mmm}_{year}_{row.counter:02d}"


def retirer_marques_fin(description: str) -> str:
    d = (description or "").strip()
    d = re.sub(r"\s*[✓√]\s*$", "", d)
    d = re.sub(r"\s*\$\\checkmark\$\s*$", "", d)
    d = re.sub(r"\$\s*checkmark\s*\$", "", d, flags=re.I)
    return d.strip()


def garantir_marque_fin_taches(tasks: list[dict[str, Any]]) -> None:
    for t in tasks:
        d = retirer_marques_fin(str(t.get("description", "")))
        if not d:
            t["description"] = f"Intervention documentée {MARQUE_TACHE_FIN}"
        else:
            t["description"] = f"{d} {MARQUE_TACHE_FIN}"
        if t.get("completed") is None:
            t["completed"] = True


EXPANSIONS = {
    "pompe": (
        "Vérification de l’ensemble pompe ; contrôle garnitures et lubrification ; "
        "mise sous pression fonctionnelle"
    ),
    "filtre": (
        "Nettoyage / remplacement des éléments filtrants ; contrôle étanchéité et "
        "couple de reserrage"
    ),
    "jauge": (
        "Étalonnage et contrôle fonctionnel du capteur de pression ou température "
        "sur plage nominale"
    ),
    "climatisation": (
        "Contrôle filtres air, évaporateur ; vérification consignes et cycles chaud/froid"
    ),
    "lubrificateur": (
        "Lubrification des points mobiles selon fiche prestataire ; contrôle niveaux "
        "après rotation"
    ),
}


def enrichir_brief(ligne: str) -> str:
    l = ligne.lower()
    for k, v in EXPANSIONS.items():
        if k in l:
            return v
    if len(ligne) > 110:
        return ligne
    return (
        "Réalisation de l’activité suivante conformément aux consignes de maintenance : "
        f"{ligne}"
    )


def fallback_parse(text: str, db: Session) -> dict[str, Any]:
    lines = [ln for ln in text.split("\n") if ln.strip()]
    out: dict[str, Any] = {
        "client_name": "Organisme inconnu",
        "location": "Lieu inconnu",
        "date": datetime.utcnow().isoformat(),
        "tasks": [],
        "notes": "",
        "executive_summary": (
            "Intervention préventive documentée. Les équipements concernés ont été "
            "contrôlés et remis dans un état conforme aux attentes OMMP après essais "
            "fonctionnels."
        ),
        "findings": (
            "Constats défavorables critiques non évoqués dans la note brute ou à "
            "préciser après contrôle prolongé sur site."
        ),
        "recommendations": (
            "1. Programmer la prochaine visite préventive selon le planning marinaire.\n"
            "2. Conserver la traçabilité des équipements (codes projet / bornes).\n"
            "3. Signaler tout dysfonctionnement résiduel avant la prochaine rotation."
        ),
        "objectif_intervention": (
            "Sécuriser l’état fonctionnel du système après intervention et valider les "
            "accès conformément au cahier des charges."
        ),
        "resume": (
            "Intervention menée conformément aux règles de maintenance preventive ; "
            "périmètre couvert comme indiqué sur la fiche."
        ),
        "problemes_et_recommandations": (
            "Voir section constats détaillés et recommandations pour le suivi des actions "
            "correctives préventives."
        ),
        "port_name": "",
        "project_title": "",
        "reference_intervention_suggeree": "",
    }
    tasks: list[dict[str, Any]] = []
    note_lines: list[str] = []

    for line in lines:
        ll = line.lower()
        if "port" in ll and ":" in line:
            out["port_name"] = line.split(":", 1)[-1].strip() or out["port_name"]
            if out["port_name"] and not out["project_title"]:
                out["project_title"] = build_ommp_project_title(out["port_name"])
        elif re.search(r"client\b|entreprise\b", ll) and ":" in line:
            out["client_name"] = line.split(":", 1)[-1].strip() or out["client_name"]
        elif "lieu" in ll and ":" in line:
            out["location"] = line.split(":", 1)[-1].strip() or out["location"]
        elif "location" in ll and ":" in line:
            out["location"] = line.split(":", 1)[-1].strip() or out["location"]
        elif "date" in ll and ":" in line:
            ds = line.split(":", 1)[-1].strip()
            if ds:
                try:
                    out["date"] = datetime.fromisoformat(ds).isoformat()
                except Exception:
                    pass
        elif (
            "technicien" in ll or "ingenieur" in ll or "engineer" in ll
        ) and ":" in line:
            # Ignore legacy technician lines — field removed
            pass
        elif line.strip().startswith(("-", "*")) or re.match(r"^\d+[\).\s]", line):
            td = re.sub(r"^[-*]\s*", "", line)
            td = re.sub(r"^\d+[\).\s]+\s*", "", td).strip()
            if td:
                tasks.append({"description": enrichir_brief(td), "completed": True})
        elif line.strip():
            note_lines.append(line)

    if not out["port_name"] and len(str(out.get("location", ""))) > 1:
        loc = str(out["location"])
        out["port_name"] = loc.split(",")[0].split(";")[0].strip()
        if out["port_name"] and not out["project_title"]:
            out["project_title"] = build_ommp_project_title(out["port_name"])

    if not tasks:
        tasks.append(
            {
                "description": (
                    "Vérification générale périmètres accès maritime et terrestre ; "
                    "contrôle liaison et documentation de fin d’intervention "
                    f"{MARQUE_TACHE_FIN}"
                ),
                "completed": True,
            }
        )
        out["notes"] = text
    else:
        out["notes"] = "\n".join(note_lines)

    garantir_marque_fin_taches(tasks)
    out["tasks"] = tasks
    if not out["project_title"] and out["port_name"]:
        out["project_title"] = build_ommp_project_title(str(out["port_name"]))

    dt = _parse_iso_to_dt(str(out["date"]))
    out["reference_intervention_suggeree"] = allocate_intervention_ref(db, dt)
    return out


def post_traiter_parse(raw: dict[str, Any], db: Session) -> dict[str, Any]:
    parsed: dict[str, Any] = {
        "client_name": raw.get("client_name") or "Organisme inconnu",
        "location": raw.get("location") or "Lieu inconnu",
        "date": raw.get("date") or datetime.utcnow().isoformat(),
        "tasks": raw.get("tasks") if isinstance(raw.get("tasks"), list) else [],
        "notes": raw.get("notes") or "",
        "executive_summary": raw.get("executive_summary") or raw.get("resume") or "",
        "findings": raw.get("findings") or "",
        "recommendations": raw.get("recommendations") or "",
        "port_name": raw.get("port_name") or "",
        "project_title": raw.get("project_title") or "",
        "objectif_intervention": raw.get("objectif_intervention") or "",
        "resume": raw.get("resume") or raw.get("executive_summary") or "",
        "problemes_et_recommandations": raw.get("problemes_et_recommandations") or "",
        "reference_intervention_suggeree": raw.get("reference_intervention_suggeree") or "",
    }

    if not str(parsed.get("project_title", "")).strip() and str(
        parsed.get("port_name", "")
    ).strip():
        parsed["project_title"] = build_ommp_project_title(
            str(parsed["port_name"]).strip()
        )

    if not str(parsed.get("resume", "")).strip() and str(
        parsed.get("executive_summary", "")
    ).strip():
        parsed["resume"] = parsed["executive_summary"]

    pr = str(parsed.get("problemes_et_recommandations", "")).strip()
    if pr and not str(parsed.get("findings", "")).strip() and not str(
        parsed.get("recommendations", "")
    ).strip():
        parts = re.split(r"\n\n+", pr)
        if len(parts) >= 2:
            parsed["findings"] = "\n\n".join(parts[:-1])
            parsed["recommendations"] = parts[-1]
        else:
            parsed["findings"] = pr
        parsed["problemes_et_recommandations"] = ""

    tasks = parsed["tasks"]
    garantir_marque_fin_taches(tasks)
    for t in tasks:
        if t.get("completed") is None:
            t["completed"] = True
        if not str(t.get("description", "")).strip():
            t["description"] = f"Tâche documentée {MARQUE_TACHE_FIN}"

    if not tasks:
        tasks.append(
            {
                "description": f"Intervention documentée {MARQUE_TACHE_FIN}",
                "completed": True,
            }
        )
    parsed["tasks"] = tasks

    ds = str(parsed["date"])
    try:
        ds2 = ds if "T" in ds else f"{ds}T12:00:00"
        parsed["date"] = datetime.fromisoformat(ds2.replace("Z", "+00:00")).isoformat()
    except Exception:
        parsed["date"] = datetime.utcnow().isoformat()

    dt = _parse_iso_to_dt(str(parsed["date"]))
    parsed["reference_intervention_suggeree"] = allocate_intervention_ref(db, dt)
    return parsed


def parse_maintenance_ommp(text: str, db: Session) -> dict[str, Any]:
    client = _llm_client()
    if client is None:
        print("[WARNING] Pas de OPENAI_API_KEY alors que OPENAI_BASE_URL pointe vers api.openai.com — secours.")
        out = fallback_parse(text, db)
        _terminal_ai_block(
            "POST /api/parse-text (secours, pas de clé OpenAI officielle)",
            [
                ("Texte reçu", (text or "").strip()),
                ("Réponse JSON (secours)", json.dumps(out, ensure_ascii=False, default=str)),
            ],
        )
        return out

    prompt = f"""Vous êtes un réviseur technique pour rapports Huawei/Waycon destinés à l’Office de la Marine Marchande et des Ports (OMMP).
TÂCHE : corriger uniquement orthographe, conjugaison, grammaire et ton professionnel TECHNIQUE en français moderne conforme chantier-maritime/portuaire ; ne pas changer le fond ni les données de contexte métier présentes dans le texte utilisateur.

RÈGLES STRICTES :
- Langue sortie pour TOUS les champs textuels suivants : FRANÇAIS rigoureux (accents inclus sauf titre projet voir infra).
- Préservez IDENTIQUEMENT les codes/alphanumériques métier sans les modifier ou supprimer (exemples : FW10, G2-CAM08, NTP, CPE, IVS, TVWALL).
- Réformulations courtes avec verbes d’action (Vérification, Installation, Réparation, Nettoyage, Mise au point, Calibration, Réglage…).
- Tâches (« tasks ») : tableau ordonné = liste numérotée des tâches réalisées (l’ordre des éléments compte comme 1, 2, 3…).
  Chaque champ description doit OBLIGATOIREMENT se terminer par la séquence littérale exacte $\\checkmark$ (dollar, antislash, « checkmark », dollar), sans caractère ✓ ni autre variante.
  Phrase technique directe puis un espace puis $\\checkmark$. completed = true par défaut si l’action est une réalisation ou une consignation de travail effectué.
- project_title doit être EXACTEMENT : "{OMMP_PROJECT_TITLE_PREFIX} [NOM DU PORT]" — NOM DU PORT en MAJUSCULES.
- port_name : nom du ou des ports comme entité géographique.
- objectif_intervention : une ou deux phrases de finalité officielle formulées après nettoyage de la rédaction brute.
- executive_summary : résumé exécutif 2 ou 3 phrases en français très formel chantier marin.
- resume : synonyme fonctionnel peut reprendre executive_summary si plus concis mais DOIT être en français aussi.
- findings : constats techniques / problèmes identifiés, clairs, factuels, niveau d’urgence explicite si pertinent.
- recommendations : recommandations et priorités, français technique, actions attendues identifiables.
- problemes_et_recommandations : champ unique optionnel combiné constats+priorités (chaîne peut être vide).
- reference_intervention_suggeree : laisser "" (chaîne vide) ; le système attribuera PREV_MMM_YYYY_NN côté serveur.
- notes : observations libres restantes après structuration.

Ne fournissez AUCUNE explication, seulement l’JSON.

Texte utilisateur brut :
{text.strip()}

Retournez UNIQUEMENT un objet JSON UTF-8 valide ayant précisément les clés : client_name, location, date, tasks, notes, executive_summary, resume, findings, recommendations, problemes_et_recommandations (chaîne peut être vide), port_name, project_title, objectif_intervention, reference_intervention_suggeree"""

    try:
        completion = _chat_completion_with_fallback(
            client,
            [{"role": "user", "content": prompt}],
            0.35,
            response_format_json=True,
        )
        response_text = (completion.choices[0].message.content or "").strip()
        if response_text.startswith("```"):
            parts = response_text.split("```")
            response_text = parts[1] if len(parts) > 1 else response_text
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        parsed_flat = json.loads(response_text)
        if not isinstance(parsed_flat, dict):
            raise ValueError("JSON racine doit être un objet")
        result = post_traiter_parse(parsed_flat, db)
        _terminal_ai_block(
            f"POST /api/parse-text (LLM · {_llm_log_suffix()})",
            [
                ("Texte utilisateur reçu", (text or "").strip()),
                ("JSON brut du modèle (après nettoyage ```)", response_text),
                ("Objet renvoyé au client (post-traité)", json.dumps(result, ensure_ascii=False, default=str)),
            ],
        )
        return result
    except Exception as e:
        print(f"[ERROR] parse_maintenance_ommp: {e}")
        import traceback

        traceback.print_exc()
        fb = fallback_parse(text, db) if text.strip() else fallback_parse("", db)
        _terminal_ai_block(
            "POST /api/parse-text (erreur → secours)",
            [
                ("Exception", str(e)),
                ("Texte reçu", (text or "").strip()),
                ("Réponse JSON (secours)", json.dumps(fb, ensure_ascii=False, default=str)),
            ],
        )
        return fb


_REFINE_FEW_SHOT_TASK = """
EXEMPLE 1 — note technicien (orthographe approximative, anglicismes « check », « fix ») :
Entrée : on a check la camera FW10 et fix le cable rj45 pck il y avait pas de signal et aussi on a change la position de g1-cam4
Sortie : Diagnostic et vérification de la caméra FW10, suivi de la réparation du câble réseau (RJ45) pour rétablir le signal. Modification de la position de la caméra G1-CAM4 pour optimiser la couverture.

EXEMPLE 2 — vocabulaire familier, système TVWALL :
Entrée : le grand ecran tvwall de l'entree principale marchait pas du tout du coup on a du reparer le systeme et maintenant c'est bon tout marche nickel
Sortie : Diagnostic, réparation et remise en service complète du TVWALL de l'entrée principale.
""".strip()

_REFINE_FEW_SHOT_RECOMMENDATION = """
EXEMPLE — recommandation client à formuler professionnellement :
Entrée : faut dire au client d'acheter des pieces de rechange rapidement (comme des injecteurs et des cables ac) parce que si ca capoute ils vont galerer avec l'assurance
Sortie : Il est fortement conseillé d'accélérer les déclarations de sinistres à l'assureur et de constituer un stock de rechange de sécurité (Injecteurs, câbles réseau, câbles AC, etc.).
""".strip()


def _clean_refine_output(text: str) -> str:
    """Retire préambules / notes explicatives que certains modèles ajoutent malgré la consigne."""
    out = (text or "").strip()
    if not out:
        return ""

    # Préambule type « Voici … : » suivi du vrai texte
    for sep in (":\n\n", ":\n", " : "):
        if sep in out[:120].lower() and "voici" in out[:80].lower():
            tail = out.split(sep, 1)[-1].strip()
            if len(tail) > 40:
                out = tail
            break

    # Paragraphe « Note : … » en fin de réponse
    out = re.sub(r"\n+Note\s*:.*$", "", out, flags=re.I | re.DOTALL).strip()
    return out


def _refine_french_prompt(raw: str, field: str) -> str:
    field = (field or "task").strip().lower()
    common = """RÈGLES COMMUNES (OMMP / Huawei / Waycon) :
- Langue de sortie : français professionnel, technique, adapté aux rapports d’intervention portuaire.
- Tolérer et corriger les entrées en français approximatif, argot, fautes, anglicismes (« check », « fix », etc.).
- Préserver IDENTIQUEMENT les codes et références alphanumériques présents dans le texte source. Normaliser uniquement la casse si nécessaire (ex. g1-cam4 → G1-CAM4).
- Ne jamais recopier les codes figurant uniquement dans les EXEMPLES ci-dessous s’ils sont absents du texte source.
- Ne pas inventer d’équipement, de lieu ou d’action absents du texte source ; reformuler le fond déjà exprimé.
- Sortie : UNIQUEMENT le texte final (un seul paragraphe ou bloc), sans guillemets, sans préambule (« Voici… », « Note : »), sans explication sur ta méthode."""

    if field == "recommendation":
        return f"""Tu rédiges des recommandations client pour un rapport de maintenance portuaire.

{common}
- Ton : conseil professionnel adressé au client (formulations du type « Il est fortement conseillé… », « Il est recommandé… »).
- Tu peux structurer clairement les actions attendues (stock de rechange, assurance, délais) lorsque le technicien les évoque implicitement.

{_REFINE_FEW_SHOT_RECOMMENDATION}

Texte source :
{raw}"""

    if field == "finding":
        return f"""Tu rédiges la section « problèmes détectés » d’un rapport de maintenance portuaire.

{common}
- Ton : constats factuels, niveau d’urgence explicite si le technicien l’indique.

Texte source :
{raw}"""

    if field == "objectif":
        return f"""Tu rédiges l’objectif d’intervention d’un rapport de maintenance portuaire.

{common}
- Ton : une ou deux phrases de finalité officielle, concises.

Texte source :
{raw}"""

    return f"""Tu transformes des notes brutes de technicien en formulations professionnelles pour la section « tâches réalisées » d’un rapport de maintenance portuaire.

{common}
- Utilise des verbes d’action techniques (Diagnostic, Vérification, Réparation, Remise en service, Modification, etc.).
- Condense les interventions multiples en une ou deux phrases fluides si le technicien les regroupe dans une même note.

{_REFINE_FEW_SHOT_TASK}

Texte source :
{raw}"""


def refine_french_light(text: str, field: str = "task") -> tuple[str, bool]:
    """Retourne (texte_professionnel, fallback_sans_appel_LLM)."""
    raw = (text or "").strip()
    if not raw:
        return "", False

    client = _llm_client()
    if client is None:
        _terminal_ai_block(
            "POST /api/refine-french (secours, pas de OPENAI_API_KEY pour api.openai.com)",
            [("Champ", field), ("Entrée", raw), ("Sortie (identique, pas d’appel modèle)", raw)],
        )
        return raw, True

    prompt = _refine_french_prompt(raw, field)

    try:
        completion = _chat_completion_with_fallback(
            client,
            [{"role": "user", "content": prompt}],
            0.2,
        )
        out = (completion.choices[0].message.content or "").strip()
        if out.startswith('"') and out.endswith('"') and len(out) >= 2:
            out = out[1:-1]
        final = _clean_refine_output(out) or raw
        _terminal_ai_block(
            f"POST /api/refine-french (LLM · {_llm_log_suffix()} · {field})",
            [("Entrée", raw), ("Sortie modèle", final)],
        )
        return final, False
    except Exception as e:
        print(f"[ERROR] refine_french_light: {e}")
        _terminal_ai_block(
            f"POST /api/refine-french (erreur LLM · {_llm_log_suffix()} → entrée renvoyée)",
            [("Champ", field), ("Entrée", raw), ("Exception", str(e)), ("Sortie (secours)", raw)],
        )
        return raw, True
