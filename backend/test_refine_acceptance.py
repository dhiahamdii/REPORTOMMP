"""
Critères d'acceptation IA — reformulation française (POST /api/refine-french).
Usage : backend démarré, puis depuis backend/ :
  python test_refine_acceptance.py
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

API = os.getenv("API_BASE", "http://127.0.0.1:8000")

CASES = [
    {
        "name": "Camera codes & broken French",
        "field": "task",
        "input": (
            "on a check la camera FW10 et fix le cable rj45 pck il y avait pas de signal "
            "et aussi on a change la position de g1-cam4"
        ),
        "must_contain": ["FW10", "RJ45", "G1-CAM4"],
    },
    {
        "name": "TVWALL technical vocabulary",
        "field": "task",
        "input": (
            "le grand ecran tvwall de l'entree principale marchait pas du tout du coup "
            "on a du reparer le systeme et maintenant c'est bon tout marche nickel"
        ),
        "must_contain": ["TVWALL", "entrée principale"],
    },
    {
        "name": "Recommandations client",
        "field": "recommendation",
        "input": (
            "faut dire au client d'acheter des pieces de rechange rapidement "
            "(comme des injecteurs et des cables ac) parce que si ca capoute ils vont "
            "galerer avec l'assurance"
        ),
        "must_contain": ["conseillé", "rechange"],
    },
]


def refine(text: str, field: str) -> str:
    body = json.dumps({"text": text, "field": field}).encode("utf-8")
    req = urllib.request.Request(
        f"{API}/api/refine-french",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data.get("text", ""))


def main() -> None:
    print(f"API: {API}\n")
    failed = 0
    for case in CASES:
        print(f"=== {case['name']} ({case['field']}) ===")
        print(f"IN : {case['input'][:100]}…")
        try:
            out = refine(case["input"], case["field"])
        except urllib.error.URLError as e:
            print(f"ERREUR réseau : {e}\n")
            failed += 1
            continue
        print(f"OUT: {out}\n")
        missing = [k for k in case["must_contain"] if k.lower() not in out.lower()]
        if missing:
            print(f"  WARN manquant (souple) : {missing}\n")
        if out.strip() == case["input"].strip():
            print("  WARN sortie identique a l entree (modele ou secours)\n")
    print("Terminé — comparer OUT aux formulations attendues dans le cahier de tests.")


if __name__ == "__main__":
    main()
