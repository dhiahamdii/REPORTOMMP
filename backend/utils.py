from datetime import datetime
from sqlalchemy.orm import Session

from models import InterventionCounter
from ommp_ai import MONTH_SHORT_EN


def generate_report_id(db: Session) -> str:
    """
    Generate a unique report ID in the format: PREV_MMM_YYYY_XX
    where XX is a sequential counter for the month.
    """
    now = datetime.utcnow()
    month = MONTH_SHORT_EN[now.month - 1]
    year = now.year

    counter = (
        db.query(InterventionCounter)
        .filter(InterventionCounter.month == month, InterventionCounter.year == year)
        .first()
    )

    if counter is None:
        counter = InterventionCounter(month=month, year=year, counter=0)
        db.add(counter)

    counter.counter += 1
    db.commit()
    db.refresh(counter)

    return f"PREV_{month}_{year}_{counter.counter:02d}"


def parse_maintenance_text(text: str, db: Session) -> dict:
    """Délègue au module OMMP (OpenAI + post-traitement + réf. PREV)."""
    from ommp_ai import parse_maintenance_ommp

    return parse_maintenance_ommp(text, db)
