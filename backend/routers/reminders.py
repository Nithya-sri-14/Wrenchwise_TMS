from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/api/reminders",
    tags=["reminders"]
)

@router.get("/", response_model=List[schemas.Reminder])
def get_reminders(db: Session = Depends(get_db)):
    return db.query(models.Reminder).order_by(models.Reminder.timestamp.desc()).all()

@router.post("/", response_model=schemas.Reminder)
def create_reminder(reminder: schemas.ReminderCreate, db: Session = Depends(get_db)):
    db_reminder = models.Reminder(
        id=str(uuid.uuid4()),
        trainerId=reminder.trainerId,
        trainerName=reminder.trainerName,
        date=reminder.date,
        time=reminder.time,
        note=reminder.note,
        status=reminder.status,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.put("/{reminder_id}", response_model=schemas.Reminder)
def update_reminder(reminder_id: str, reminder_update: schemas.ReminderUpdate, db: Session = Depends(get_db)):
    db_reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    db_reminder.status = reminder_update.status
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str, db: Session = Depends(get_db)):
    db_reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    db.delete(db_reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}
