"""Helpers ports / contacts pour l’API."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.orm import Session

from models import Port, PortContact


def slugify(label: str) -> str:
    s = label.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-") or "port"
    return s[:72]


def unique_slug(db: Session, base: str, exclude_slug: str | None = None) -> str:
    slug = slugify(base)
    candidate = slug
    n = 2
    while True:
        q = db.query(Port).filter(Port.slug == candidate)
        if exclude_slug:
            q = q.filter(Port.slug != exclude_slug)
        if q.first() is None:
            return candidate
        candidate = f"{slug}-{n}"
        n += 1


def port_to_dict(port: Port) -> dict[str, Any]:
    site = []
    intervention = []
    for c in port.contacts:
        item = {"id": str(c.id), "line": c.line}
        if c.contact_type == "site":
            site.append(item)
        else:
            intervention.append(item)
    return {
        "id": port.slug,
        "label": port.label,
        "portName": port.port_name,
        "interventionLocation": port.intervention_location,
        "clientName": port.client_name,
        "contractRef": port.contract_ref,
        "siteContacts": site,
        "interventionContacts": intervention,
    }


def get_port_by_slug(db: Session, slug: str) -> Port | None:
    return db.query(Port).filter(Port.slug == slug).first()


def replace_contacts(
    db: Session,
    port: Port,
    contact_type: str,
    lines: list[str],
) -> None:
    db.query(PortContact).filter(
        PortContact.port_id == port.id,
        PortContact.contact_type == contact_type,
    ).delete(synchronize_session=False)
    db.flush()
    for i, line in enumerate(lines):
        line = (line or "").strip()
        if not line:
            continue
        db.add(
            PortContact(
                port_id=port.id,
                contact_type=contact_type,
                line=line,
                sort_order=i,
            )
        )


def new_contact_id() -> str:
    return f"c-{uuid.uuid4().hex[:12]}"
