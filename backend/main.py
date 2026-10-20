"""API FastAPI — charge `backend/.env` pour OPENAI_API_KEY avant les routes IA."""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    _backend_dir = Path(__file__).resolve().parent
    load_dotenv(_backend_dir / ".env")
except ImportError:
    pass

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from models import init_db, get_db, Client, Report, Task, Port, PortContact, InterventionObjective
from schemas import (
    ClientCreate, ClientUpdate, Client as ClientSchema,
    ReportCreate, ReportUpdate, Report as ReportSchema, ReportWithClient,
    TaskCreate, Task as TaskSchema,
    AIParsingRequest,
    RefineFrenchRequest, RefineFrenchResponse,
    NextPrevRefRequest, NextPrevRefResponse,
    ReportStats,
    PortCreate, PortUpdate, PortResponse,
    PortContactCreate, PortContactUpdate, PortContactItem,
    ObjectiveCreate, ObjectiveUpdate, ObjectiveResponse,
)
from ports_service import (
    get_port_by_slug,
    port_to_dict,
    replace_contacts,
    slugify,
    unique_slug,
)
from utils import generate_report_id, parse_maintenance_text
from ommp_ai import refine_french_light, peek_intervention_ref, allocate_intervention_ref, parse_request_date

# Initialize FastAPI app
app = FastAPI(
    title="Maintenance Report API",
    description="API for managing maintenance reports",
    version="1.0.0"
)

# CORS : en prod, définir CORS_ORIGINS=http://VOTRE_IP_ELASTIQUE,https://votre-domaine
_cors_raw = (os.getenv("CORS_ORIGINS") or "*").strip()
_cors_origins = ["*"] if _cors_raw == "*" else [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# ============================================================================
# CLIENT ENDPOINTS
# ============================================================================

@app.get("/api/clients", response_model=List[ClientSchema])
def list_clients(db: Session = Depends(get_db)):
    """List all clients."""
    clients = db.query(Client).all()
    return clients

@app.post("/api/clients", response_model=ClientSchema)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    """Create a new client."""
    # Check if client already exists
    existing = db.query(Client).filter(Client.name == client.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client with this name already exists"
        )
    
    db_client = Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/api/clients/{client_id}", response_model=ClientSchema)
def get_client(client_id: int, db: Session = Depends(get_db)):
    """Get a specific client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/api/clients/{client_id}", response_model=ClientSchema)
def update_client(client_id: int, client: ClientUpdate, db: Session = Depends(get_db)):
    """Update a client."""
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
    
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/api/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Delete a client and all their reports."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}

# ============================================================================
# REPORT ENDPOINTS
# ============================================================================

@app.get("/api/reports", response_model=List[ReportWithClient])
def list_reports(db: Session = Depends(get_db)):
    """List all reports (newest first)."""
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    return reports

@app.post("/api/reports", response_model=ReportSchema)
def create_report(report: ReportCreate, db: Session = Depends(get_db)):
    """Create a new report."""
    # Get or create client
    client = db.query(Client).filter(Client.name == report.client_name).first()
    if not client:
        client = Client(
            name=report.client_name,
            location=report.location
        )
        db.add(client)
        db.flush()  # Flush to get the client ID
    
    # Use provided PREV ref when already allocated (form / AI), else generate
    requested = (report.report_id or "").strip()
    if requested:
        existing = db.query(Report).filter(Report.report_id == requested).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Report ID already exists: {requested}")
        report_id = requested
    else:
        report_id = generate_report_id(db)
    
    # Create report
    db_report = Report(
        report_id=report_id,
        client_id=client.id,
        date=report.date,
        location=report.location,
        notes=report.notes,
        signature=report.signature
    )
    db.add(db_report)
    db.flush()  # Flush to get the report ID
    
    # Create tasks
    for task in report.tasks:
        db_task = Task(
            report_id=db_report.id,
            description=task.description,
            completed=task.completed
        )
        db.add(db_task)
    
    db.commit()
    db.refresh(db_report)
    return db_report

@app.get("/api/reports/{report_id}", response_model=ReportWithClient)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Get a specific report by report_id."""
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.put("/api/reports/{report_id}", response_model=ReportSchema)
def update_report(report_id: str, report: ReportUpdate, db: Session = Depends(get_db)):
    """Update a report."""
    db_report = db.query(Report).filter(Report.report_id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    update_data = report.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_report, key, value)
    
    db_report.updated_at = datetime.utcnow()
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str, db: Session = Depends(get_db)):
    """Delete a report and all its tasks."""
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

# ============================================================================
# PORT DIRECTORY ENDPOINTS
# ============================================================================

@app.get("/api/ports", response_model=List[PortResponse])
def list_ports(db: Session = Depends(get_db)):
    """Liste tous les ports avec leurs contacts."""
    ports = db.query(Port).order_by(Port.label).all()
    return [port_to_dict(p) for p in ports]


@app.post("/api/ports", response_model=PortResponse, status_code=status.HTTP_201_CREATED)
def create_port(body: PortCreate, db: Session = Depends(get_db)):
    """Crée un port et ses contacts initiaux."""
    slug = (body.slug or "").strip() or unique_slug(db, body.label)
    if get_port_by_slug(db, slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un port avec l'identifiant « {slug} » existe déjà.",
        )
    port = Port(
        slug=slug,
        label=body.label.strip(),
        port_name=body.port_name.strip().upper(),
        intervention_location=body.intervention_location.strip(),
        client_name=body.client_name.strip(),
        contract_ref=(body.contract_ref or "").strip(),
    )
    db.add(port)
    db.flush()
    replace_contacts(db, port, "site", body.site_contacts)
    replace_contacts(db, port, "intervention", body.intervention_contacts)
    db.commit()
    db.refresh(port)
    return port_to_dict(port)


@app.get("/api/ports/{slug}", response_model=PortResponse)
def get_port(slug: str, db: Session = Depends(get_db)):
    port = get_port_by_slug(db, slug)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    return port_to_dict(port)


@app.put("/api/ports/{slug}", response_model=PortResponse)
def update_port(slug: str, body: PortUpdate, db: Session = Depends(get_db)):
    port = get_port_by_slug(db, slug)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    data = body.model_dump(exclude_unset=True)
    site_lines = data.pop("site_contacts", None)
    iv_lines = data.pop("intervention_contacts", None)
    field_map = {
        "label": "label",
        "port_name": "port_name",
        "intervention_location": "intervention_location",
        "client_name": "client_name",
        "contract_ref": "contract_ref",
    }
    for key, attr in field_map.items():
        if key in data and data[key] is not None:
            val = data[key].strip() if isinstance(data[key], str) else data[key]
            if attr == "port_name":
                val = str(val).upper()
            setattr(port, attr, val)
    if site_lines is not None:
        replace_contacts(db, port, "site", site_lines)
    if iv_lines is not None:
        replace_contacts(db, port, "intervention", iv_lines)
    db.commit()
    db.refresh(port)
    return port_to_dict(port)


@app.delete("/api/ports/{slug}")
def delete_port(slug: str, db: Session = Depends(get_db)):
    port = get_port_by_slug(db, slug)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    db.delete(port)
    db.commit()
    return {"message": "Port deleted successfully"}


@app.post("/api/ports/{slug}/contacts", response_model=PortContactItem)
def add_port_contact(slug: str, body: PortContactCreate, db: Session = Depends(get_db)):
    port = get_port_by_slug(db, slug)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    line = body.line.strip()
    if not line:
        raise HTTPException(status_code=400, detail="Contact line is required")
    ctype = body.contact_type
    if ctype not in ("site", "intervention"):
        raise HTTPException(status_code=400, detail="contact_type must be site or intervention")
    max_order = (
        db.query(PortContact)
        .filter(PortContact.port_id == port.id, PortContact.contact_type == ctype)
        .count()
    )
    contact = PortContact(
        port_id=port.id,
        contact_type=ctype,
        line=line,
        sort_order=max_order,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return PortContactItem(id=str(contact.id), line=contact.line)


@app.put("/api/ports/{slug}/contacts/{contact_id}", response_model=PortContactItem)
def update_port_contact(
    slug: str,
    contact_id: int,
    body: PortContactUpdate,
    db: Session = Depends(get_db),
):
    port = get_port_by_slug(db, slug)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    contact = (
        db.query(PortContact)
        .filter(PortContact.id == contact_id, PortContact.port_id == port.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if body.line is not None:
        line = body.line.strip()
        if not line:
            raise HTTPException(status_code=400, detail="Contact line cannot be empty")
        contact.line = line
    db.commit()
    db.refresh(contact)
    return PortContactItem(id=str(contact.id), line=contact.line)


@app.delete("/api/ports/{slug}/contacts/{contact_id}")
def delete_port_contact(slug: str, contact_id: int, db: Session = Depends(get_db)):
    port = get_port_by_slug(db, slug)
    if not port:
        raise HTTPException(status_code=404, detail="Port not found")
    contact = (
        db.query(PortContact)
        .filter(PortContact.id == contact_id, PortContact.port_id == port.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}


# ============================================================================
# INTERVENTION OBJECTIVES (catalogue)
# ============================================================================

@app.get("/api/objectives", response_model=List[ObjectiveResponse])
def list_objectives(db: Session = Depends(get_db)):
    """Liste les objectifs d'intervention du catalogue."""
    rows = (
        db.query(InterventionObjective)
        .order_by(InterventionObjective.sort_order, InterventionObjective.id)
        .all()
    )
    return rows


@app.post("/api/objectives", response_model=ObjectiveResponse, status_code=status.HTTP_201_CREATED)
def create_objective(body: ObjectiveCreate, db: Session = Depends(get_db)):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Le texte de l'objectif est requis.")
    max_order = db.query(InterventionObjective).count()
    row = InterventionObjective(text=text, sort_order=max_order)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/objectives/{objective_id}", response_model=ObjectiveResponse)
def update_objective(objective_id: int, body: ObjectiveUpdate, db: Session = Depends(get_db)):
    row = db.query(InterventionObjective).filter(InterventionObjective.id == objective_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    if body.text is not None:
        text = body.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Le texte de l'objectif ne peut pas être vide.")
        row.text = text
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/objectives/{objective_id}")
def delete_objective(objective_id: int, db: Session = Depends(get_db)):
    row = db.query(InterventionObjective).filter(InterventionObjective.id == objective_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    db.delete(row)
    db.commit()
    return {"message": "Objectif supprimé"}


# ============================================================================
# AI PARSING ENDPOINT
# ============================================================================

@app.post("/api/parse-text")
def parse_maintenance_report(request: AIParsingRequest, db: Session = Depends(get_db)):
    """Parse maintenance report text (IA OpenAI côté serveur)."""
    try:
        return parse_maintenance_text(request.text, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse text: {str(e)}",
        )


@app.post("/api/refine-french", response_model=RefineFrenchResponse)
def refine_french_endpoint(body: RefineFrenchRequest):
    """Correction orthographique / grammaticale légère (français)."""
    out, fb = refine_french_light(body.text, field=body.field)
    return RefineFrenchResponse(text=out, fallback=fb)


@app.post("/api/next-prev-ref", response_model=NextPrevRefResponse)
def next_prev_ref_endpoint(body: NextPrevRefRequest, db: Session = Depends(get_db)):
    """Aperçu ou attribution d'un numéro PREV_MMM_YYYY_NN (compteur SQLite)."""
    dt = parse_request_date(body.date)
    if body.allocate:
        ref = allocate_intervention_ref(db, dt)
    else:
        ref = peek_intervention_ref(db, dt)
    return NextPrevRefResponse(
        reference=ref,
        date_used=dt.isoformat(),
        allocated=body.allocate,
    )

# ============================================================================
# STATISTICS ENDPOINT
# ============================================================================

@app.get("/api/stats", response_model=ReportStats)
def get_stats(db: Session = Depends(get_db)):
    """Get system statistics."""
    total_reports = db.query(Report).count()
    total_clients = db.query(Client).count()
    
    tasks = db.query(Task).all()
    completed_tasks = sum(1 for task in tasks if task.completed)
    pending_tasks = len(tasks) - completed_tasks
    
    return ReportStats(
        total_reports=total_reports,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        total_clients=total_clients
    )

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

# Root endpoint
@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Maintenance Report API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
