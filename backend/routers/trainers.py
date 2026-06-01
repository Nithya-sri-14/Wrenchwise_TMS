from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/api/trainers",
    tags=["trainers"]
)

@router.get("/", response_model=List[schemas.Trainer])
def get_trainers(db: Session = Depends(get_db)):
    return db.query(models.Trainer).all()

@router.get("/{trainer_id}", response_model=schemas.Trainer)
def get_trainer(trainer_id: str, db: Session = Depends(get_db)):
    trainer = db.query(models.Trainer).filter(models.Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer

@router.post("/", response_model=schemas.Trainer)
def create_trainer(trainer: schemas.TrainerCreate, db: Session = Depends(get_db)):
    db_trainer = models.Trainer(
        id=str(uuid.uuid4()),
        name=trainer.name,
        email=trainer.email,
        phone=trainer.phone,
        linkedin=trainer.linkedin,
        location=trainer.location,
        currentEmployer=trainer.currentEmployer,
        designation=trainer.designation,
        totalExperience=trainer.totalExperience,
        teachingExperience=trainer.teachingExperience,
        skills=trainer.skills,
        certifications=trainer.certifications,
        education=trainer.education,
        source=trainer.source,
        dateAdded=trainer.dateAdded,
        dateParsed=trainer.dateParsed,
        engagementPreference=trainer.engagementPreference,
        currentCTC=trainer.currentCTC,
        expectedCTC=trainer.expectedCTC,
        hourlyExpectation=trainer.hourlyExpectation,
        dailyRate=trainer.dailyRate,
        perSessionPricing=trainer.perSessionPricing,
        perBatchExpectation=trainer.perBatchExpectation,
        negotiability=trainer.negotiability,
        deliveryMode=trainer.deliveryMode,
        travelWillingness=trainer.travelWillingness,
        locationPreference=trainer.locationPreference,
        availabilityTimeline=trainer.availabilityTimeline,
        audienceFit=trainer.audienceFit,
        status=trainer.status,
        internalRating=trainer.internalRating
    )
    
    db.add(db_trainer)
    db.commit()
    db.refresh(db_trainer)

    # Add timeline and assignments if any
    for t_event in trainer.timeline:
        db_event = models.TimelineEvent(**t_event.dict(), trainer_id=db_trainer.id)
        db.add(db_event)
        
    for a_event in trainer.assignments:
        db_assignment = models.Assignment(**a_event.dict(), trainer_id=db_trainer.id)
        db.add(db_assignment)
        
    db.commit()
    db.refresh(db_trainer)
    return db_trainer

@router.put("/{trainer_id}", response_model=schemas.Trainer)
def update_trainer(trainer_id: str, trainer_update: schemas.TrainerUpdate, db: Session = Depends(get_db)):
    db_trainer = db.query(models.Trainer).filter(models.Trainer.id == trainer_id).first()
    if not db_trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
        
    update_data = trainer_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_trainer, key, value)
        
    db.commit()
    db.refresh(db_trainer)
    return db_trainer

@router.delete("/{trainer_id}")
def delete_trainer(trainer_id: str, db: Session = Depends(get_db)):
    db_trainer = db.query(models.Trainer).filter(models.Trainer.id == trainer_id).first()
    if not db_trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
        
    db.delete(db_trainer)
    db.commit()
    return {"message": "Trainer deleted successfully"}

@router.post("/{trainer_id}/timeline", response_model=schemas.TimelineEvent)
def add_timeline_event(trainer_id: str, event: schemas.TimelineEventCreate, db: Session = Depends(get_db)):
    db_trainer = db.query(models.Trainer).filter(models.Trainer.id == trainer_id).first()
    if not db_trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
        
    db_event = models.TimelineEvent(**event.dict(), trainer_id=trainer_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event
