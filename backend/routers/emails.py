from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/api/emails",
    tags=["emails"]
)

@router.get("/", response_model=List[schemas.OutboxEmail])
def get_emails(db: Session = Depends(get_db)):
    return db.query(models.OutboxEmail).order_by(models.OutboxEmail.timestamp.desc()).all()

@router.post("/", response_model=schemas.OutboxEmail)
def send_email(email: schemas.OutboxEmailCreate, db: Session = Depends(get_db)):
    # In a real app, integrate Brevo API here
    # e.g., requests.post("https://api.brevo.com/v3/smtp/email", ...)
    
    db_email = models.OutboxEmail(
        id=str(uuid.uuid4()),
        timestamp=datetime.utcnow().isoformat() + "Z",
        recipientEmail=email.recipientEmail,
        recipientName=email.recipientName,
        senderIdentity=email.senderIdentity,
        subject=email.subject,
        body=email.body,
        status="Delivered"  # Mock status
    )
    db.add(db_email)
    
    # Optional: Log interaction to timeline if trainerId is provided
    if email.trainerId:
        db_trainer = db.query(models.Trainer).filter(models.Trainer.id == email.trainerId).first()
        if db_trainer:
            db_event = models.TimelineEvent(
                id=str(uuid.uuid4()),
                trainer_id=db_trainer.id,
                date=datetime.utcnow().isoformat() + "Z",
                recruiter=f"Talent Operations ({email.senderIdentity.split('@')[0]})",
                type="email",
                summary=f'Sent automated email outreach: "{email.subject}".',
                standpoint="Awaiting candidate response.",
                concern="",
                nextAction="Follow up via Email or Phone",
                followUpDate=""
            )
            db.add(db_event)
            
    db.commit()
    db.refresh(db_email)
    return db_email
