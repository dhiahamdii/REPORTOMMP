"""Données initiales des ports (alignées sur frontend/lib/portDirectory.ts)."""

from __future__ import annotations

from models import Port, PortContact

DEFAULT_PORTS = [
    {
        "slug": "rades",
        "label": "Port de Radès",
        "port_name": "RADES",
        "intervention_location": "Zone portuaire — Radès",
        "client_name": "Office de la Marine Marchande et des Ports (OMMP)",
        "contract_ref": "OMMP-HW-WC-2024-RAD",
        "site_contacts": [
            "M. Ben Ali — Responsable exploitation portuaire — +216 XX XXX XXX",
            "Service sécurité accès — Poste principal",
        ],
        "intervention_contacts": [
            "Huawei — Ingénieur système vidéo — support@huawei.example",
            "Waycon — Chef de projet intégration — contact@waycon.example",
        ],
    },
    {
        "slug": "bizerte",
        "label": "Port de Bizerte",
        "port_name": "BIZERTE",
        "intervention_location": "Zone portuaire — Bizerte",
        "client_name": "Office de la Marine Marchande et des Ports (OMMP)",
        "contract_ref": "OMMP-HW-WC-2024-BIZ",
        "site_contacts": [
            "Mme Trabelsi — Coordinatrice portuaire — +216 XX XXX XXX",
            "Garde-côte — Bureau accès maritime",
        ],
        "intervention_contacts": [
            "Huawei — Contact terrain Nord — nord@huawei.example",
            "Waycon — Supervision chantier — bizerte@waycon.example",
        ],
    },
    {
        "slug": "gabes",
        "label": "Port de Gabès",
        "port_name": "GABES",
        "intervention_location": "Zone portuaire — Gabès",
        "client_name": "Office de la Marine Marchande et des Ports (OMMP)",
        "contract_ref": "OMMP-HW-WC-2025-GAB",
        "site_contacts": [
            "Chef de poste — Sécurité terrestre et maritime",
        ],
        "intervention_contacts": [
            "Huawei — Support IVS / TVWALL",
            "Waycon — Interlocuteur projet Gabès",
        ],
    },
]


def seed_ports_if_empty(db) -> None:
    if db.query(Port).count() > 0:
        return
    for pdata in DEFAULT_PORTS:
        port = Port(
            slug=pdata["slug"],
            label=pdata["label"],
            port_name=pdata["port_name"],
            intervention_location=pdata["intervention_location"],
            client_name=pdata["client_name"],
            contract_ref=pdata["contract_ref"],
        )
        db.add(port)
        db.flush()
        for i, line in enumerate(pdata.get("site_contacts", [])):
            db.add(
                PortContact(
                    port_id=port.id,
                    contact_type="site",
                    line=line,
                    sort_order=i,
                )
            )
        for i, line in enumerate(pdata.get("intervention_contacts", [])):
            db.add(
                PortContact(
                    port_id=port.id,
                    contact_type="intervention",
                    line=line,
                    sort_order=i,
                )
            )
    db.commit()
