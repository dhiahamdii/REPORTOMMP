from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

RefineFrenchField = Literal["task", "recommendation", "finding", "objectif"]

# Task schemas
class TaskBase(BaseModel):
    description: str
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    report_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Client schemas
class ClientBase(BaseModel):
    name: str
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None

class Client(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ClientWithReports(Client):
    reports: List['Report'] = []

# Report schemas
class ReportBase(BaseModel):
    date: datetime
    technician_name: str
    location: str
    notes: Optional[str] = None
    signature: Optional[str] = None

class ReportCreate(ReportBase):
    client_name: str
    tasks: List[TaskCreate]

class ReportUpdate(BaseModel):
    date: Optional[datetime] = None
    technician_name: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    signature: Optional[str] = None

class Report(ReportBase):
    id: int
    report_id: str
    client_id: int
    created_at: datetime
    updated_at: datetime
    tasks: List[Task] = []
    
    class Config:
        from_attributes = True

class ReportWithClient(Report):
    client: Client

# AI Parsing request schema
class AIParsingRequest(BaseModel):
    text: str


class RefineFrenchRequest(BaseModel):
    text: str
    field: RefineFrenchField = Field(
        default="task",
        description="Contexte du champ : tâche, recommandation client, constat ou objectif.",
    )


class RefineFrenchResponse(BaseModel):
    text: str
    fallback: bool = False


class NextPrevRefRequest(BaseModel):
    date: Optional[str] = None
    allocate: bool = False


class NextPrevRefResponse(BaseModel):
    reference: str
    date_used: str
    allocated: bool

# Port directory schemas
PortContactType = Literal["site", "intervention"]


class PortContactItem(BaseModel):
    id: str
    line: str


class PortContactCreate(BaseModel):
    line: str
    contact_type: PortContactType


class PortContactUpdate(BaseModel):
    line: Optional[str] = None


class PortBase(BaseModel):
    label: str
    port_name: str
    intervention_location: str
    client_name: str
    contract_ref: str = ""


class PortCreate(PortBase):
    slug: Optional[str] = None
    site_contacts: List[str] = Field(default_factory=list)
    intervention_contacts: List[str] = Field(default_factory=list)


class PortUpdate(BaseModel):
    label: Optional[str] = None
    port_name: Optional[str] = None
    intervention_location: Optional[str] = None
    client_name: Optional[str] = None
    contract_ref: Optional[str] = None
    site_contacts: Optional[List[str]] = None
    intervention_contacts: Optional[List[str]] = None


class PortResponse(BaseModel):
    id: str
    label: str
    portName: str
    interventionLocation: str
    clientName: str
    contractRef: str
    siteContacts: List[PortContactItem]
    interventionContacts: List[PortContactItem]


# Stats schemas
class ReportStats(BaseModel):
    total_reports: int
    completed_tasks: int
    pending_tasks: int
    total_clients: int
