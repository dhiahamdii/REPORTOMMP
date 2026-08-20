import os
from pathlib import Path

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    location = Column(String(255))
    contact_person = Column(String(255))
    contact_phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    reports = relationship("Report", back_populates="client", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True)
    report_id = Column(String(50), unique=True, nullable=False)  # PREV_MMM_YYYY_XX format
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    technician_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    notes = Column(Text)
    signature = Column(Text)  # Base64 encoded signature image
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    client = relationship("Client", back_populates="reports")
    tasks = relationship("Task", back_populates="report", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    description = Column(Text, nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    report = relationship("Report", back_populates="tasks")


class Port(Base):
    __tablename__ = "ports"

    id = Column(Integer, primary_key=True)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    port_name = Column(String(120), nullable=False)
    intervention_location = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=False)
    contract_ref = Column(String(120), nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contacts = relationship(
        "PortContact",
        back_populates="port",
        cascade="all, delete-orphan",
        order_by="PortContact.sort_order",
    )


class PortContact(Base):
    __tablename__ = "port_contacts"

    id = Column(Integer, primary_key=True)
    port_id = Column(Integer, ForeignKey("ports.id", ondelete="CASCADE"), nullable=False)
    contact_type = Column(String(20), nullable=False)  # site | intervention
    line = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    port = relationship("Port", back_populates="contacts")


class InterventionCounter(Base):
    __tablename__ = "intervention_counter"
    
    id = Column(Integer, primary_key=True)
    month = Column(String(3), nullable=False)  # MMM format
    year = Column(Integer, nullable=False)
    counter = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Database setup (DATABASE_URL pour prod : volume persistant, ex. sqlite:////data/maintenance_reports.db)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./maintenance_reports.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize the database and seed default ports if empty."""
    Base.metadata.create_all(bind=engine)
    from port_seed import seed_ports_if_empty

    db = SessionLocal()
    try:
        seed_ports_if_empty(db)
    finally:
        db.close()

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
